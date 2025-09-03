// 20250823151500-add-indexes-to-learning-sessions.js
'use strict';

module.exports = {
  up: async (queryInterface) => {
    const table = 'learning_sessions';

    // 防呆：只在列存在时建索引，避免再次报错
    const desc = await queryInterface.describeTable(table);

    if (desc.teacher_id) {
      await queryInterface.addIndex(table, ['teacher_id'], {
        name: 'learning_sessions_teacher_id'
      });
    }

    if (desc.student_id) {
      await queryInterface.addIndex(table, ['student_id'], {
        name: 'learning_sessions_student_id'
      });
    }

    if (desc.start_at) {
      await queryInterface.addIndex(table, ['start_at'], {
        name: 'learning_sessions_start_at'   // ← 用 start_at
      });
    }
  },

  down: async (queryInterface) => {
    const table = 'learning_sessions';
    await queryInterface.removeIndex(table, 'learning_sessions_teacher_id');
    await queryInterface.removeIndex(table, 'learning_sessions_student_id');
    await queryInterface.removeIndex(table, 'learning_sessions_start_at'); // ← 对应上面名字
  }
};
