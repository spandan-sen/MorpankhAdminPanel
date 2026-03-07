const express = require("express")
const {product_model,dash_model,audit_model} = require("../../config/database")
const router = express.Router()
const mongoose = require("mongoose")

router.get("/:id", async (req,res)=>{
      const session = await mongoose.startSession()
    session.startTransaction()
    try{
        const id = req.params.id
        const barcode = req.query.bcd  

        if(!id){
            return res.status(400).send("Invalid Product ID")
        }

        if(req.session.loginType == "admin"){
            const result = await product_model.deleteOne({id:id},{session})
            await audit_model.insertOne({
                actionUser:req.session.admin,
                actionType:"Product Deletion",
                actionTarget:`${barcode}`
                
                },{session})
            
            
            if(result.deletedCount === 0){
                return res.status(404).send("Product not found")
            }

            console.log("Product Deleted ID : ",id)
            console.log(result)
            await session.commitTransaction()
            session.endSession()

            return res.redirect(`/admin/products/allProducts?page=${req.session.pageNum}&search=all`)

        }else{
            return res.redirect(`/admin/products/edit/${id}`)

        }


    }catch(err){
        console.error("Product Delete Route Error:",err)
        return res.status(500).send("Internal Server Error")
    }
})

module.exports = router
