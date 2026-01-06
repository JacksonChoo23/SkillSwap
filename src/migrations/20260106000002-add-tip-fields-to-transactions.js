'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('transactions', 'recipient_user_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await queryInterface.addColumn('transactions', 'type', {
            type: Sequelize.STRING(50),
            allowNull: true,
            defaultValue: 'payment'
        });

        // Add index for faster queries
        await queryInterface.addIndex('transactions', ['recipient_user_id']);
        await queryInterface.addIndex('transactions', ['type']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('transactions', 'recipient_user_id');
        await queryInterface.removeColumn('transactions', 'type');
    }
};
