'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add new columns to reports table
        await queryInterface.addColumn('reports', 'evidence', {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: []
        });

        await queryInterface.addColumn('reports', 'ai_analysis', {
            type: Sequelize.JSON,
            allowNull: true
        });

        await queryInterface.addColumn('reports', 'ai_verdict', {
            type: Sequelize.ENUM('pending', 'violation', 'harmless', 'uncertain'),
            allowNull: false,
            defaultValue: 'pending'
        });

        await queryInterface.addColumn('reports', 'severity', {
            type: Sequelize.ENUM('none', 'low', 'medium', 'high', 'critical'),
            allowNull: false,
            defaultValue: 'none'
        });

        await queryInterface.addColumn('reports', 'admin_notes', {
            type: Sequelize.TEXT,
            allowNull: true
        });

        await queryInterface.addColumn('reports', 'penalty_applied', {
            type: Sequelize.STRING(100),
            allowNull: true
        });

        // Update status enum (need to recreate for MySQL)
        // First, update existing values to a temp state
        await queryInterface.sequelize.query(
            `UPDATE reports SET status = 'pending_ai' WHERE status = 'open'`
        );
        await queryInterface.sequelize.query(
            `UPDATE reports SET status = 'resolved' WHERE status = 'closed'`
        );

        // Alter the enum
        await queryInterface.changeColumn('reports', 'status', {
            type: Sequelize.ENUM('pending_ai', 'ai_reviewed', 'escalated', 'resolved', 'dismissed', 'auto_penalized'),
            defaultValue: 'pending_ai'
        });

        // Add indexes
        await queryInterface.addIndex('reports', ['ai_verdict']);
        await queryInterface.addIndex('reports', ['severity']);

        // Add suspension columns to users table
        await queryInterface.addColumn('users', 'is_suspended', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });

        await queryInterface.addColumn('users', 'suspension_end_date', {
            type: Sequelize.DATE,
            allowNull: true
        });

        await queryInterface.addColumn('users', 'suspension_reason', {
            type: Sequelize.TEXT,
            allowNull: true
        });

        await queryInterface.addColumn('users', 'is_banned', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });

        await queryInterface.addColumn('users', 'warning_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove user columns
        await queryInterface.removeColumn('users', 'warning_count');
        await queryInterface.removeColumn('users', 'is_banned');
        await queryInterface.removeColumn('users', 'suspension_reason');
        await queryInterface.removeColumn('users', 'suspension_end_date');
        await queryInterface.removeColumn('users', 'is_suspended');

        // Remove report indexes
        await queryInterface.removeIndex('reports', ['severity']);
        await queryInterface.removeIndex('reports', ['ai_verdict']);

        // Remove report columns
        await queryInterface.removeColumn('reports', 'penalty_applied');
        await queryInterface.removeColumn('reports', 'admin_notes');
        await queryInterface.removeColumn('reports', 'severity');
        await queryInterface.removeColumn('reports', 'ai_verdict');
        await queryInterface.removeColumn('reports', 'ai_analysis');
        await queryInterface.removeColumn('reports', 'evidence');

        // Revert status enum
        await queryInterface.changeColumn('reports', 'status', {
            type: Sequelize.ENUM('open', 'closed'),
            defaultValue: 'open'
        });
    }
};
