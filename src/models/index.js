// src/models/index.js
'use strict';

const path = require('path');
const Sequelize = require('sequelize');
const { sequelize } = require('../config/database');

// 统一加载：工厂 / 已初始化模型 / 裸类
function normalizeModel(modExport, fileName) {
  // 已初始化的模型（或已 init 的类）：带 getTableName && sequelize
  if (modExport && typeof modExport.getTableName === 'function' && modExport.sequelize) {
    return modExport;
  }

  // 工厂函数：不是 class，且是函数
  const isFunction = typeof modExport === 'function';
  const looksLikeClass = isFunction && /^\s*class\s/.test(Function.prototype.toString.call(modExport));

  if (isFunction && !looksLikeClass) {
    // 调用工厂函数 (sequelize, DataTypes) => Model
    return modExport(sequelize, Sequelize.DataTypes);
  }

  // 裸类：给出明确提示，要求你把该文件改成工厂或导出已初始化的模型
  const hint = [
    `Model file "${fileName}" exports a class that is not initialized.`,
    `Fix it by EITHER:`,
    `  (A) Export a factory: module.exports = (sequelize, DataTypes) => {`,
    `        class X extends DataTypes.Model { static associate(models){} }`,
    `        X.init({/* attrs */}, { sequelize, tableName: '...', modelName: 'X' });`,
    `        return X;`,
    `      }`,
    `  (B) Or export initialized model:`,
    `      class X extends Sequelize.Model {};`,
    `      X.init({/* attrs */}, { sequelize, tableName: '...', modelName: 'X' });`,
    `      module.exports = X;`
  ].join('\n');

  throw new TypeError(hint);
}

// 显式列出你的模型文件，避免意外文件被加载
const files = [
  'User.js',
  'Skill.js',
  'UserSkill.js',
  'Availability.js',
  'Listing.js',
  'MessageThread.js',
  'Message.js',
  'LearningSession.js',
  'Rating.js',
  'Report.js',
  'TipToken.js',
  'Notification.js',
  'CalculatorWeight.js',
  'Category.js',
  'UserProgress.js',
  'ContactHistory.js',
  'SavedSuggestion.js'
];

// 加载并规范化
const db = {};
for (const f of files) {
  const m = require(path.join(__dirname, f));
  const model = normalizeModel(m, f);
  db[model.name] = model;
}

// 这里做关联——沿用你原来的写法（现在是"全是模型实例"，不会再把工厂/类误传进来）
const {
  User, Skill, UserSkill, Availability, Listing, MessageThread, Message,
  LearningSession, Rating, Report, TipToken, Notification, CalculatorWeight, Category,
  UserProgress, ContactHistory, SavedSuggestion
} = db;

// User <-> UserSkill
User.hasMany(UserSkill, { foreignKey: 'userId', as: 'userSkills' });
UserSkill.belongsTo(User, { foreignKey: 'userId' });

// User <-> Availability
User.hasMany(Availability, { foreignKey: 'userId', as: 'availabilities' });
Availability.belongsTo(User, { foreignKey: 'userId' });

// User <-> Listing
User.hasMany(Listing, { foreignKey: 'userId', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'userId' });

// ★ Listing <-> Skill（teach）
Skill.hasMany(Listing,  { foreignKey: 'skillId', as: 'listings' });
Listing.belongsTo(Skill, { foreignKey: 'skillId', as: 'Skill' });

// ★ Listing <-> Skill（learn - optional swap target）
Skill.hasMany(Listing,  { foreignKey: 'learnSkillId', as: 'learnListings' });
Listing.belongsTo(Skill, { foreignKey: 'learnSkillId', as: 'LearnSkill' });

// User <-> MessageThread（双向参与）
User.hasMany(MessageThread, { foreignKey: 'creatorId',     as: 'createdThreads' });
User.hasMany(MessageThread, { foreignKey: 'participantId', as: 'participatedThreads' });
MessageThread.belongsTo(User, { foreignKey: 'creatorId',     as: 'creator' });
MessageThread.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });

// MessageThread <-> Message
MessageThread.hasMany(Message, { foreignKey: 'threadId', as: 'messages' });
Message.belongsTo(MessageThread, { foreignKey: 'threadId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// LearningSession <-> User / Skill
User.hasMany(LearningSession, { foreignKey: { name: 'teacher_id', field: 'teacher_id' }, as: 'teachingSessions' });
User.hasMany(LearningSession, { foreignKey: { name: 'student_id', field: 'student_id' }, as: 'learningSessions' });
LearningSession.belongsTo(User, { foreignKey: { name: 'teacher_id', field: 'teacher_id' }, as: 'teacher' });
LearningSession.belongsTo(User, { foreignKey: { name: 'student_id', field: 'student_id' }, as: 'student' });
LearningSession.belongsTo(Skill, { foreignKey: 'skillId' });

// Rating
LearningSession.hasMany(Rating, { foreignKey: 'sessionId', as: 'ratings' });
Rating.belongsTo(LearningSession, { foreignKey: 'sessionId' });
Rating.belongsTo(User, { foreignKey: 'raterId', as: 'rater' });
Rating.belongsTo(User, { foreignKey: 'rateeId', as: 'ratee' });

// Report
User.hasMany(Report, { foreignKey: 'reporterId', as: 'reportedIssues' });
User.hasMany(Report, { foreignKey: 'targetUserId', as: 'reportsAgainst' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

// TipToken
User.hasMany(TipToken, { foreignKey: 'fromUserId', as: 'sentTips' });
User.hasMany(TipToken, { foreignKey: 'toUserId', as: 'receivedTips' });
TipToken.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
TipToken.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' });

// Notifications
// Table uses underscored column user_id
User.hasMany(Notification, { foreignKey: { name: 'user_id', field: 'user_id' }, as: 'notifications' });
Notification.belongsTo(User, { foreignKey: { name: 'user_id', field: 'user_id' }, as: 'user' });

// Skill / Category / CalculatorWeight
Skill.hasMany(UserSkill, { foreignKey: 'skillId', as: 'userSkills' });
UserSkill.belongsTo(Skill, { foreignKey: 'skillId' });

Category.hasMany(Skill, { foreignKey: 'categoryId', as: 'skills' });
Skill.belongsTo(Category, { foreignKey: 'categoryId' });

Category.hasMany(CalculatorWeight, { foreignKey: 'categoryId', as: 'weights' });
CalculatorWeight.belongsTo(Category, { foreignKey: 'categoryId' });

// Listing <-> MessageThread
Listing.hasMany(MessageThread, { foreignKey: 'listingId', as: 'messageThreads' });
MessageThread.belongsTo(Listing, { foreignKey: 'listingId' });

// Progress
User.hasMany(UserProgress, { foreignKey: 'userId', as: 'progress' });
UserProgress.belongsTo(User, { foreignKey: 'userId' });
UserProgress.belongsTo(LearningSession, { foreignKey: 'sessionId' });

// ContactHistory
User.hasMany(ContactHistory, { as: 'outgoingContacts', foreignKey: { name: 'user_id',      field: 'user_id' } });
User.hasMany(ContactHistory, { as: 'incomingContacts', foreignKey: { name: 'peer_user_id', field: 'peer_user_id' } });
ContactHistory.belongsTo(User, { as: 'actor', foreignKey: { name: 'user_id',      field: 'user_id' } });
ContactHistory.belongsTo(User, { as: 'peer',  foreignKey: { name: 'peer_user_id', field: 'peer_user_id' } });

// SavedSuggestion
User.hasMany(SavedSuggestion, { foreignKey: 'user_id', as: 'savedSuggestions' });
SavedSuggestion.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  ...db
};
