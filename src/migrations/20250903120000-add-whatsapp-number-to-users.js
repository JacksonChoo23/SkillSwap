"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "whatsappNumber", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    // Optional index for quick filter
    await queryInterface.addIndex("users", ["whatsappNumber"], {
      name: "users_whatsapp_number_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("users", "users_whatsapp_number_idx");
    await queryInterface.removeColumn("users", "whatsappNumber");
  },
};


