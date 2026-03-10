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
  const rules = await db.query('SELECT * FROM alert_rules');
  console.log(rules);
  process.exit(0);
}).catch(console.error);
