if(window.alertMessage.length>0){
  window.showAlert(window.alertMessage[0],window.alertMessage[1])
}
//Query Filter Code - 
const itemCount = document.querySelector(".item-count")
itemCount.textContent = `${dataset.length} Products`


console.log(dataset)

const searchInput = document.querySelector("#searchBox");

// Restore from URL (on page load)
const params = new URLSearchParams(window.location.search);
const searchFromUrl = params.get("search");
let page = parseInt(params.get("page")) || 1;
document.querySelector(".page-num").textContent = page

if (searchFromUrl) {
  searchInput.value = searchFromUrl;
}

// 2️⃣ On change, redirect
searchInput.addEventListener("change", () => {
  const value = searchInput.value.trim();
  if (!value) return;
  const url = `/admin/products/allProducts?search=${encodeURIComponent(value)}&page=${page}`;
  // store LAST orders URL
  localStorage.setItem("products_last_url", url);

  window.location.href =
    `/admin/products/allProducts?page=${page}&search=${encodeURIComponent(value)}`;
});
const next = document.querySelector("#next")

next.addEventListener("click",()=>{
  const params = new URLSearchParams(window.location.search);
  let page = parseInt(params.get("page")) || 1;
  const search = params.get("search") || "";
  page++; // move to next page
  document.querySelector(".page-num").textContent = page
  window.location.href = `/admin/products/allProducts?page=${page}&search=${encodeURIComponent(search)}`;

})
const prev = document.querySelector("#prev")

prev.addEventListener("click",()=>{
  const params = new URLSearchParams(window.location.search);
  let page = parseInt(params.get("page")) || 1;
  const search = params.get("search") || "";
  if(page == 1){
    window.showAlert("info","You are already on the 1st Page")
    return

  }else{
    page--
      document.querySelector(".page-num").textContent = page
  } // move to next page
  window.location.href = `/admin/products/allProducts?page=${page}&search=${search}`;

})
let modal_mode = ""
//Barcode Print
const barcodePrint = document.querySelector("#barcode-print")
barcodePrint.addEventListener("click",()=>{
  const search = params.get("search") || "";
  window.location.href = `/admin/products/barcodePrint?page=${page}&search=${encodeURIComponent(search)}`
})
const barcodeReset = document.querySelector("#barcode-reset")
barcodeReset.addEventListener("click",()=>{
  modal_mode = "print-reset"
  const dataform = document.querySelector(".product-grid")
  const confirmBox = document.querySelector(".confirm-box")
  confirmBox.style.display = "block"



})
document.querySelector(".back").addEventListener("click",()=>{
    const dataform = document.querySelector(".product-grid")
    dataform.classList.remove("blur")
    const confirmBox = document.querySelector(".confirm-box")
    confirmBox.style.display = "none"
    const state = document.querySelector("#state")
    state.value = prev_state


})
document.querySelector(".confirm").addEventListener("click",()=>{
    if(modal_mode == "print-reset"){
        const search = params.get("search") || "";
      window.location.href = `/admin/products/barcodePrintReset?page=${page}&search=${encodeURIComponent(search)}`

    }



})
