class User {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.phone_number = data.phone_number;
        this.role = data.role;
        this.access_level = data.access_level;
        this.location = data.location;
        this.is_blocked = data.is_blocked;
        this.created_at = data.created_at;
        this.otp = data.otp;
        this.otp_expiry = data.otp_expiry;
        this.admin_id = data.admin_id;
    }
}

module.exports = User;
