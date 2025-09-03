const { sequelize } = require('../config/database');

// Import models
const User = require('./User');
const Skill = require('./Skill');
const UserSkill = require('./UserSkill');
const Availability = require('./Availability');
const Listing = require('./Listing');
const MessageThread = require('./MessageThread');
const Message = require('./Message');
const LearningSession = require('./LearningSession');
const Rating = require('./Rating');
const Report = require('./Report');
const TipToken = require('./TipToken');
const CalculatorWeight = require('./CalculatorWeight');
const Category = require('./Category');
const UserProgress = require('./UserProgress');
const ContactHistory = require('./ContactHistory');

// Define associations
User.hasMany(UserSkill, { foreignKey: 'userId', as: 'userSkills' });
UserSkill.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Availability, { foreignKey: 'userId', as: 'availabilities' });
Availability.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Listing, { foreignKey: 'userId', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(MessageThread, { foreignKey: 'creatorId', as: 'createdThreads' });
User.hasMany(MessageThread, { foreignKey: 'participantId', as: 'participatedThreads' });
MessageThread.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });
MessageThread.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });

MessageThread.hasMany(Message, { foreignKey: 'threadId', as: 'messages' });
Message.belongsTo(MessageThread, { foreignKey: 'threadId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(LearningSession, { foreignKey: { name: 'teacher_id', field: 'teacher_id' }, as: 'teachingSessions' });
User.hasMany(LearningSession, { foreignKey: { name: 'student_id', field: 'student_id' }, as: 'learningSessions' });
LearningSession.belongsTo(User, { foreignKey: { name: 'teacher_id', field: 'teacher_id' }, as: 'teacher' });
LearningSession.belongsTo(User, { foreignKey: { name: 'student_id', field: 'student_id' }, as: 'student' });

LearningSession.hasMany(Rating, { foreignKey: 'sessionId', as: 'ratings' });
Rating.belongsTo(LearningSession, { foreignKey: 'sessionId' });
Rating.belongsTo(User, { foreignKey: 'raterId', as: 'rater' });
Rating.belongsTo(User, { foreignKey: 'rateeId', as: 'ratee' });

User.hasMany(Report, { foreignKey: 'reporterId', as: 'reportedIssues' });
User.hasMany(Report, { foreignKey: 'targetUserId', as: 'reportsAgainst' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

User.hasMany(TipToken, { foreignKey: 'fromUserId', as: 'sentTips' });
User.hasMany(TipToken, { foreignKey: 'toUserId', as: 'receivedTips' });
TipToken.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
TipToken.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' });

Skill.hasMany(UserSkill, { foreignKey: 'skillId', as: 'userSkills' });
UserSkill.belongsTo(Skill, { foreignKey: 'skillId' });

Category.hasMany(Skill, { foreignKey: 'categoryId', as: 'skills' });
Skill.belongsTo(Category, { foreignKey: 'categoryId' });

Category.hasMany(CalculatorWeight, { foreignKey: 'categoryId', as: 'weights' });
CalculatorWeight.belongsTo(Category, { foreignKey: 'categoryId' });

Listing.hasMany(MessageThread, { foreignKey: 'listingId', as: 'messageThreads' });
MessageThread.belongsTo(Listing, { foreignKey: 'listingId' });

LearningSession.belongsTo(Skill, { foreignKey: 'skillId' });

// Progress associations
User.hasMany(UserProgress, { foreignKey: 'userId', as: 'progress' });
UserProgress.belongsTo(User, { foreignKey: 'userId' });
UserProgress.belongsTo(LearningSession, { foreignKey: 'sessionId' });

// Contact history associations
User.hasMany(ContactHistory, { as: 'outgoingContacts', foreignKey: { name: 'user_id', field: 'user_id' } });
User.hasMany(ContactHistory, { as: 'incomingContacts', foreignKey: { name: 'peer_user_id', field: 'peer_user_id' } });
ContactHistory.belongsTo(User, { as: 'actor', foreignKey: { name: 'user_id', field: 'user_id' } });
ContactHistory.belongsTo(User, { as: 'peer', foreignKey: { name: 'peer_user_id', field: 'peer_user_id' } });

module.exports = {
  sequelize,
  User,
  Skill,
  UserSkill,
  Availability,
  Listing,
  MessageThread,
  Message,
  LearningSession,
  Rating,
  Report,
  TipToken,
  CalculatorWeight,
  Category,
  UserProgress,
  ContactHistory
};