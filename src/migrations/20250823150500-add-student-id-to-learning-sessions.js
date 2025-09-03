module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('learning_sessions', 'student_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('learning_sessions', 'student_id');
  }
};
