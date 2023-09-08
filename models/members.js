module.exports = (sequelize, DataTypes) => {
	return sequelize.define('members', {
		// Model attributes are defined here
        userId: {
            type: DataTypes.STRING,
            primaryKey: true,            
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        timestamps: true,
    });
};