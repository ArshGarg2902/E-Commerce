const mongoose=require('mongoose');
const carItemSchema=new mongoose.Schema({
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product'
    },
    quantity:Number
})
const cartItem=mongoose.model("CartItem",carItemSchema);

module.exports=cartItem;