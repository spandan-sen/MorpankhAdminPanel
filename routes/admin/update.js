const express = require("express")
const mongoose = require("mongoose")
const {product_model,alert_model,dash_model,audit_model} = require("../../config/database")
const router = express.Router()

router.post("/", async (req,res)=>{

    const session = await mongoose.startSession()
    session.startTransaction()

    try{

        console.dir(`Updation Request [ Name : ${req.body.name}] Status : Accepted`)
        const category = req.body.category

        if(!req.body.id){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).send("Invalid Product ID")
        }

        if(!req.body.name){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).send("Product name required")
        }

        let attribute_object= {}

        // -------- YOUR ATTRIBUTE LOGIC (UNCHANGED) --------
        if(category == "readymade"){
              attribute_object = {  
                "readymadeLength":req.body.readymadeLength,
                "readymadeFit":req.body.readymadeFit,
                "readymadeDesign":req.body.readymadeDesign,
                "readymadeSleeve":req.body.readymadeSleeve,
                "readymadeSize":req.body.readymadeSize,
                "readymadeFabricType" : req.body.readymadeFabricType,
                "readymadeNeckline" : req.body.readymadeNeckline,
                "readymadeType":req.body.readymadeType
            }

            if(req.body.readymadeType == "blouseStitched"){
                attribute_object.readymadeBlouseLining = req.body.readymadeBlouseLining
                attribute_object.readymadeBlouseClosure = req.body.readymadeBlouseClosure
                attribute_object.readymadeBlouseBack = req.body.readymadeBlouseBack
            }

        }else if(category == "sarees"){

            attribute_object = {
                "sareeLength":req.body.sareeLength,
                "sareeWidth":req.body.sareeWidth,
                "sareeDesign":req.body.sareeDesign,
                "blouseIncluded":req.body.blouseIncluded,
                "sareeFabricType" : req.body.sareeFabricType
            }

            if(req.body.blouseIncluded == "yes"){
                attribute_object.blouseDesign = req.body.blouseDesign
                attribute_object.blouseType = req.body.blouseType
                attribute_object.blouseMaterial = req.body.blouseMaterial
                attribute_object.blouseFabricType = req.body.blouseFabricType

                if(req.body.blouseType == "unstitched"){
                    attribute_object.blouseLength = req.body.blouseLength
                    attribute_object.blouseLining = req.body.blouseLining

                }else if(req.body.blouseType == "semi-stitched"){
                    attribute_object.blouseLength = req.body.blouseLength
                    attribute_object.blouseChest = req.body.blouseChest
                    attribute_object.blouseLining = req.body.blouseLining
                    attribute_object.blouseSleeve = req.body.blouseSleeve

                }else if(req.body.blouseType == "stitched"){
                    attribute_object.blouseSize = req.body.blouseSize
                    attribute_object.blouseLining = req.body.blouseLining
                    attribute_object.blouseSleeve = req.body.blouseSleeve
                    attribute_object.blouseClosure = req.body.blouseClosure
                    attribute_object.blouseBack = req.body.blouseBack
                }
            }

        }else if(category == "blouse"){

            attribute_object = {
                "blouseDesign":req.body.blouseDesign,
                "blouseType":req.body.blouseType,
                "blouseFabricType" : req.body.blouseFabricType,
                "blouseLining":req.body.blouseLining
            }

            if(req.body.blouseType == "unstitched"){
                attribute_object.blouseLength = req.body.blouseLength
            }else if(req.body.blouseType == "semi-stitched"){
                attribute_object.blouseLength = req.body.blouseLength
                attribute_object.blouseChest = req.body.blouseChest
                attribute_object.blouseSleeve = req.body.blouseSleeve
            }

        }else if(category == "wraps"){

            attribute_object = {
                "wrapType":req.body.wrapType,
                "wrapLength":req.body.wrapLength,
                "wrapWidth":req.body.wrapWidth,
                "wrapDesign":req.body.wrapDesign,
                "wrapFabricType" : req.body.fabricType 
            }

        }else if(category == "jewellery"){

            attribute_object = {
                "jewelleryType":req.body.jewelleryType,
                "jewelleryCraft":req.body.jewelleryCraft,
                "jewelleryWeight":req.body.jewelleryWeight
            }
        }

        // MAIN PRODUCT UPDATE
        const updateResult = await product_model.updateOne(
            {id:req.body.id},
            {$set:{
                name:req.body.name,
                mrp:req.body.mrp,
                state:req.body.state,
                description:req.body.description,
                material:req.body.material,
                stock:req.body.stock,
                attributes:attribute_object,
                images:[
                    req.body.image1,
                    req.body.image2,
                    req.body.image3,
                    req.body.image4,
                    req.body.image5,
                    req.body.image6
                ]
            }},
            { session }
        )

        if(updateResult.matchedCount === 0){
            throw new Error("Product not found")
        }
        await audit_model.insertOne({
            actionUser:req.session.admin,
            actionType:"Product Updation",
            actionTarget:`${req.body.barcode}`

        },{session})

        await dash_model.updateMany({},{
            $inc:{"adminSeshActions.productUpdated":1},
            $set:{
                "adminSeshActions.message":`Product : ${req.body.name} Updated`,
                "adminSeshActions.messageHead":"Product Updation"
            }
        }, { session })

        await alert_model.updateOne({},{$set:{updateAlert:true}}, { session })

        await session.commitTransaction()
        session.endSession()

        console.dir("Updation Request Status : Successfull")

        return res.redirect(req.get("referer") || "/admin/products")

    }catch(err){

        await session.abortTransaction()
        session.endSession()

        console.error("Product Updation Route Error:",err)
        return res.status(500).send("Internal Server Error")
    }
})

module.exports = router
