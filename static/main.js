document.addEventListener("DOMContentLoaded", () => {
    const listElement = document.getElementById("product-list");
    if (listElement) renderList(listElement);

    const addButton = document.getElementById("add-button");
    if (addButton) addButton.addEventListener("click", addReceipt);
});

function renderList(container) {
    const items = JSON.parse(localStorage.getItem("items") || "[]");
    container.innerHTML = items.map(item => 
        `<li>
        ${item}</strong> - 
        <span style="color: gay;">Expiration Date:${item.expirationDate}</span>
        </li>`).join("");

}

function clearList() {
    localStorage.removeItem("items");
    const listElement = document.getElementById("product-list");
    if (listElement) listElement.innerHTML = "";
}

function addReceipt(event) {
    if (event) event.preventDefault();

    const elem = document.createElement("input");
    elem.type = "file";

    elem.addEventListener("cancel", () => { console.log("cancelled"); });

    elem.addEventListener("change", () => {
            if (elem.files.length > 0) {

                const file = elem.files[0];
                addItem(file.name);
            }
        });

    return elem.click();
}

function addItem(name) {
    let items = JSON.parse(localStorage.getItem("items") || "[]");

    const date = new Date();
    date.setDate(date.getDate() - 7);
    const dataString = date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
    name = `${dataString} - ${name}`;
    items.push(name);
    localStorage.setItem("items", JSON.stringify(items));
}