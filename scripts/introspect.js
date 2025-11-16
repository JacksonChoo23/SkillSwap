#!/usr/bin/env node
const { sequelize } = require('../src/config/database');
async function run(){
  const tables = [
    'users','skills','categories','listings','user_skills','availabilities','message_threads','messages','sessions','learning_sessions','ratings','reports','tip_tokens','calculator_weights','contact_histories','user_progress','saved_suggestions','notifications'
  ];
  const result = {};
  for (const t of tables){
    try {
      result[t] = await sequelize.getQueryInterface().describeTable(t);
    } catch (e){
      result[t] = { error: e.message };
    }
  }
  console.log(JSON.stringify(result,null,2));
  await sequelize.close();
}
run();
