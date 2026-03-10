const { DataSource } = require('typeorm');
const db = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'opswatch',
  password: 'opswatch_secret',
  database: 'opswatch',
});
db.initialize().then(async () => {
  const res = await db.query(`UPDATE alert_rules SET threshold = NULL WHERE type NOT IN ('cpu', 'ram', 'disk')`);
  console.log('Fixed rules:', res);
  process.exit(0);
}).catch(console.error);
