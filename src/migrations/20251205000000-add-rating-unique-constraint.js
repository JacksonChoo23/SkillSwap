'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addConstraint('ratings', {
            fields: ['session_id', 'rater_id'],
            type: 'unique',
            name: 'ratings_session_rater_uq'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeConstraint('ratings', 'ratings_session_rater_uq');
    }
};
