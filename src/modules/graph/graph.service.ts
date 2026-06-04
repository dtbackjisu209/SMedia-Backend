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
};

class GraphService {
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
				id: user.id,
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
					id: follower.id,
					username: follower.username,
					avatarUrl: follower.avatarUrl ?? null,
				},
				following: {
					id: following.id,
					username: following.username,
					avatarUrl: following.avatarUrl ?? null,
				},
			},
		);
	}

	async deleteFollow(followerId: number, followingId: number): Promise<void> {
		await runNeo4jWrite(
			`
			MATCH (:User {id: $followerId})-[follow:FOLLOWS]->(:User {id: $followingId})
			DELETE follow
			`,
			{ followerId, followingId },
		);
	}

	async getFollowSuggestions(userId: number, limit: number): Promise<GraphFollowSuggestion[]> {
		const result = await runNeo4jRead<{
			id: number;
			username: string;
			avatarUrl: string | null;
			score: unknown;
		}>(
			`
			MATCH (me:User {id: $userId})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(suggested:User)
			WHERE suggested.id <> $userId
				AND NOT (me)-[:FOLLOWS]->(suggested)
			RETURN suggested.id AS id,
				suggested.username AS username,
				suggested.avatarUrl AS avatarUrl,
				count(*) AS score
			ORDER BY score DESC
			LIMIT $limit
			`,
			{ userId, limit: neo4j.int(limit) },
		);

		return result.records.map((record) => {
			const score = record.get('score');

			return {
				id: Number(record.get('id')),
				username: record.get('username'),
				avatarUrl: record.get('avatarUrl'),
				score: neo4j.isInt(score) ? neo4j.integer.toNumber(score) : Number(score),
			};
		});
	}
}

export default new GraphService();
