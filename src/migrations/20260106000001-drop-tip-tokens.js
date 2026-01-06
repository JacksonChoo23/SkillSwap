'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('TipTokens');
    },

    down: async (queryInterface, Sequelize) => {
        // Recreate table if rollback needed
        await queryInterface.createTable('TipTokens', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            fromUserId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            toUserId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            amount: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            note: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            paymentIntentId: {
                type: Sequelize.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    }
};
