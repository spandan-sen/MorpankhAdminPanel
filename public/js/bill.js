window.showAlert("success","Order Preview Generated")
const generate = document.querySelector("#generate")
document.querySelector(".success-msg").style.display = "none"

generate.addEventListener("click",()=>{
   window.showAlert("info","Invoice Generation Initiated")
   document.getElementById("invoiceLoader").classList.remove("hidden");
    
     async function generateInvoice(){
        const res = await fetch(`/admin/bill/generate-invoice/${window.orderID}`);
        const blob = await res.blob();   // ⬅️ waits till Puppeteer finishes
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice-${window.orderID}.pdf`;

            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(url);

        return  window.showAlert("success", "Invoice Generated Successfully");

     }
     generateInvoice()
     .then(res=>{
            document.getElementById("invoiceLoader").classList.add("hidden");
            document.querySelector(".button-group").style.display = "none"
            document.querySelector(".success-msg").style.display = "block"
         })

})