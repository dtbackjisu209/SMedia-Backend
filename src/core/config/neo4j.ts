import neo4j, {
	type Driver,
	type QueryResult,
	type RecordShape,
	type SessionMode,
} from 'neo4j-driver';
import { env } from './env.js';

let driver: Driver | null = null;
let connectPromise: Promise<Driver | null> | null = null;

const createNeo4jDriver = (): Driver => {
	if (!env.neo4j.password) {
		throw new Error('Missing required environment variable: NEO4J_PASSWORD');
	}

	return neo4j.driver(
		env.neo4j.uri,
		neo4j.auth.basic(env.neo4j.username, env.neo4j.password),
	);
};

export const getNeo4jDriver = (): Driver | null => driver;

export const ensureNeo4jConnected = async (): Promise<Driver | null> => {
	if (!env.neo4j.enabled) {
		return null;
	}

	if (driver) {
		return driver;
	}

	if (!connectPromise) {
		connectPromise = (async () => {
			const createdDriver = createNeo4jDriver();
			await createdDriver.verifyConnectivity();
			driver = createdDriver;
			return driver;
		})().finally(() => {
			connectPromise = null;
		});
	}

	return connectPromise;
};

export const closeNeo4j = async (): Promise<void> => {
	if (!driver) {
		return;
	}

	await driver.close();
	driver = null;
};

const runNeo4j = async <Shape extends RecordShape = RecordShape>(
	mode: SessionMode,
	cypher: string,
	params: Record<string, unknown> = {},
): Promise<QueryResult<Shape>> => {
	const connectedDriver = await ensureNeo4jConnected();
	if (!connectedDriver) {
		throw new Error('Neo4j is disabled');
	}

	const session = connectedDriver.session({
		database: env.neo4j.database,
		defaultAccessMode: mode,
	});

	try {
		return await session.run<Shape>(cypher, params);
	} finally {
		await session.close();
	}
};

export const runNeo4jRead = <Shape extends RecordShape = RecordShape>(
	cypher: string,
	params: Record<string, unknown> = {},
) => runNeo4j<Shape>(neo4j.session.READ, cypher, params);

export const runNeo4jWrite = <Shape extends RecordShape = RecordShape>(
	cypher: string,
	params: Record<string, unknown> = {},
) => runNeo4j<Shape>(neo4j.session.WRITE, cypher, params);
