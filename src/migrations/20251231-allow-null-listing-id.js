'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Allow listing_id to be NULL for direct user-to-user messages
        await queryInterface.changeColumn('message_threads', 'listing_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'listings',
                key: 'id'
            }
        });
    },

    async down(queryInterface, Sequelize) {
        // Revert: make listing_id required (but first delete any null rows)
        await queryInterface.sequelize.query(
            'DELETE FROM message_threads WHERE listing_id IS NULL'
        );
        await queryInterface.changeColumn('message_threads', 'listing_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'listings',
                key: 'id'
            }
        });
    }
};
