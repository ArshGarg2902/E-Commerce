const mongoose=require("mongoose");
const userSchema = new mongoose.Schema({
    username:String,
    password:String
})

// create the user model
const User = mongoose.model("User",userSchema);
module.exports=User;