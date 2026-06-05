import db from './models/index.js';
const { AdBanner } = db;

async function clearOldAds() {
  await db.sequelize.authenticate();
  await AdBanner.destroy({ where: {} });
  console.log("All old ads cleared!");
  process.exit(0);
}

clearOldAds();
