import { AppDataSource } from '../src/data-source.js';

const run = async () => {
  await AppDataSource.initialize();
  await AppDataSource.query('ALTER TABLE `conversations` ADD `name` varchar(255) NULL');
  await AppDataSource.destroy();
  console.log('OK');
};

run();
