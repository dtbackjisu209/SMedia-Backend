import neo4j from 'neo4j-driver';
import { runNeo4jRead, runNeo4jWrite } from '../../core/config/neo4j.js';

type GraphUserInput = {
	id: number;
	username: string;
	avatarUrl?: string | null;
};

export type GraphFollowSuggestion = {
	id: number;
	username: string;
	avatarUrl: string | null;
	score: number;
	mutualFollowCount: number;
	searchViewCount: number;
	recencyScore: number;
};

class GraphService {
	private static readonly MUTUAL_FOLLOW_CAP = 10;
	private static readonly SEARCH_VIEW_CAP = 20;
	private static readonly SEARCH_HALF_LIFE_HOURS = 168;

	async initializeSchema(): Promise<void> {
		await runNeo4jWrite(`
			CREATE CONSTRAINT user_id_unique IF NOT EXISTS
			FOR (user:User)
			REQUIRE user.id IS UNIQUE
		`);
	}

	async upsertUser(user: GraphUserInput): Promise<void> {
		await runNeo4jWrite(
			`
			MERGE (user:User {id: $id})
			SET user.username = $username,
				user.avatarUrl = $avatarUrl
			`,
			{
				id: neo4j.int(user.id),
				username: user.username,
				avatarUrl: user.avatarUrl ?? null,
			},
		);
	}

	async createFollow(follower: GraphUserInput, following: GraphUserInput): Promise<void> {
		await runNeo4jWrite(
			`
			MERGE (follower:User {id: $follower.id})
			SET follower.username = $follower.username,
				follower.avatarUrl = $follower.avatarUrl
			MERGE (following:User {id: $following.id})
			SET following.username = $following.username,
				following.avatarUrl = $following.avatarUrl
			MERGE (follower)-[:FOLLOWS]->(following)
			`,
			{
				follower: {
					id: neo4j.int(follower.id),
					username: follower.username,
					avatarUrl: follower.avatarUrl ?? null,
				},
				following: {
					id: neo4j.int(following.id),
					username: following.username,
					avatarUrl: following.avatarUrl ?? null,
				},
			},
		);
	}

	async recordSearchProfileView(
		viewer: GraphUserInput,
		target: GraphUserInput,
		query?: string,
	): Promise<void> {
		await runNeo4jWrite(
			`
			MERGE (viewer:User {id: $viewer.id})
			SET viewer.username = $viewer.username,
				viewer.avatarUrl = $viewer.avatarUrl
			MERGE (target:User {id: $target.id})
			SET target.username = $target.username,
				target.avatarUrl = $target.avatarUrl
			MERGE (viewer)-[view:VIEWED_FROM_SEARCH]->(target)
			ON CREATE SET
				view.count = 1,
				view.firstSeenAt = datetime(),
				view.lastSeenAt = datetime(),
				view.lastQuery = $query
			ON MATCH SET
				view.count = coalesce(view.count, 0) + 1,
				view.lastSeenAt = datetime(),
				view.lastQuery = $query
			`,
			{
				viewer: {
					id: neo4j.int(viewer.id),
					username: viewer.username,
					avatarUrl: viewer.avatarUrl ?? null,
				},
				target: {
					id: neo4j.int(target.id),
					username: target.username,
					avatarUrl: target.avatarUrl ?? null,
				},
				query: query?.trim() || null,
			},
		);
	}

	async deleteFollow(followerId: number, followingId: number): Promise<void> {
		await runNeo4jWrite(
			`
			MATCH (:User {id: $followerId})-[follow:FOLLOWS]->(:User {id: $followingId})
			DELETE follow
			`,
			{
				followerId: neo4j.int(followerId),
				followingId: neo4j.int(followingId),
			},
		);
	}

	async getFollowSuggestions(userId: number, limit: number): Promise<GraphFollowSuggestion[]> {
		const result = await runNeo4jRead<{
			id: number;
			username: string;
			avatarUrl: string | null;
			score: unknown;
			mutualFollowCount: unknown;
			searchViewCount: unknown;
			recencyScore: unknown;
		}>(
			`
			MATCH (me:User {id: $userId})
			CALL {
				WITH me
				MATCH (me)-[:FOLLOWS]->(:User)-[:FOLLOWS]->(candidate:User)
				WHERE candidate.id <> $userId
					AND NOT (me)-[:FOLLOWS]->(candidate)
				RETURN candidate, count(*) AS mutualFollowCount, 0 AS searchViewCount, null AS lastSeenAt

				UNION

				WITH me
				MATCH (me)-[view:VIEWED_FROM_SEARCH]->(candidate:User)
				WHERE candidate.id <> $userId
					AND NOT (me)-[:FOLLOWS]->(candidate)
				RETURN candidate, 0 AS mutualFollowCount, coalesce(view.count, 0) AS searchViewCount, view.lastSeenAt AS lastSeenAt
			}
			WITH candidate,
				sum(mutualFollowCount) AS mutualFollowCount,
				sum(searchViewCount) AS searchViewCount,
				max(lastSeenAt) AS lastSeenAt
			WITH candidate,
				mutualFollowCount,
				searchViewCount,
				CASE
					WHEN lastSeenAt IS NULL THEN 0.0
					ELSE exp(-log(2) * duration.inSeconds(lastSeenAt, datetime()).seconds / 3600.0 / $halfLifeHours)
				END AS recencyScore
			WITH candidate,
				mutualFollowCount,
				searchViewCount,
				recencyScore,
				0.6 * toFloat(CASE WHEN mutualFollowCount > $mutualCap THEN $mutualCap ELSE mutualFollowCount END) / $mutualCap
					+ 0.25 * log(1 + toFloat(CASE WHEN searchViewCount > $searchCap THEN $searchCap ELSE searchViewCount END)) / log(1 + $searchCap)
					+ 0.15 * recencyScore AS score
			RETURN candidate.id AS id,
				candidate.username AS username,
				candidate.avatarUrl AS avatarUrl,
				score,
				mutualFollowCount,
				searchViewCount,
				recencyScore
			ORDER BY score DESC
			LIMIT $limit
			`,
			{
				userId: neo4j.int(userId),
				limit: neo4j.int(limit),
				mutualCap: GraphService.MUTUAL_FOLLOW_CAP,
				searchCap: GraphService.SEARCH_VIEW_CAP,
				halfLifeHours: GraphService.SEARCH_HALF_LIFE_HOURS,
			},
		);

		return result.records.map((record) => {
			const id = record.get('id');
			const score = record.get('score');
			const mutualFollowCount = record.get('mutualFollowCount');
			const searchViewCount = record.get('searchViewCount');
			const recencyScore = record.get('recencyScore');

			return {
				id: neo4j.isInt(id) ? neo4j.integer.toNumber(id) : Number(id),
				username: record.get('username'),
				avatarUrl: record.get('avatarUrl'),
				score: neo4j.isInt(score) ? neo4j.integer.toNumber(score) : Number(score),
				mutualFollowCount: neo4j.isInt(mutualFollowCount)
					? neo4j.integer.toNumber(mutualFollowCount)
					: Number(mutualFollowCount),
				searchViewCount: neo4j.isInt(searchViewCount)
					? neo4j.integer.toNumber(searchViewCount)
					: Number(searchViewCount),
				recencyScore: neo4j.isInt(recencyScore)
					? neo4j.integer.toNumber(recencyScore)
					: Number(recencyScore),
			};
		});
	}
}

export default new GraphService();
