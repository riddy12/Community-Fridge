
const storageKey="simpleCommunityFridgeUpdates";
const searchInput=document.querySelector("#searchInput");
const cards=document.querySelectorAll(".fridge-card");
const noResults=document.querySelector("#noResults");
const fridgeSelect=document.querySelector("#fridgeName");
const logForm=document.querySelector("#logForm");
const formMessage=document.querySelector("#formMessage");
const activityList=document.querySelector("#activityList");

function getUpdates(){const saved=localStorage.getItem(storageKey);return saved?JSON.parse(saved):[]}
function saveUpdates(updates){localStorage.setItem(storageKey,JSON.stringify(updates))}
function displayUpdates(){
  const updates=getUpdates();
  activityList.innerHTML="";
  if(updates.length===0){activityList.innerHTML='<p class="empty-message">No updates have been added yet.</p>';return}
  updates.forEach(function(update){
    const item=document.createElement("article");
    item.className="activity-item";
    const title=document.createElement("h3");
    title.textContent=update.action+" at "+update.fridge;
    const details=document.createElement("p");
    details.textContent=update.details;
    item.appendChild(title);item.appendChild(details);activityList.appendChild(item);
  });
}
searchInput.addEventListener("input",function(){
  const text=searchInput.value.toLowerCase().trim();let count=0;
  cards.forEach(function(card){const show=card.dataset.search.includes(text);card.classList.toggle("hidden",!show);if(show)count++});
  noResults.classList.toggle("hidden",count!==0);
});
document.querySelectorAll(".select-fridge").forEach(function(button){
  button.addEventListener("click",function(){fridgeSelect.value=button.dataset.fridge;document.querySelector("#log").scrollIntoView({behavior:"smooth"})});
});
logForm.addEventListener("submit",function(event){
  event.preventDefault();
  const update={fridge:fridgeSelect.value,action:document.querySelector("#action").value,details:document.querySelector("#details").value.trim()};
  const updates=getUpdates();updates.unshift(update);saveUpdates(updates);formMessage.textContent="Your update was saved.";logForm.reset();displayUpdates();
  setTimeout(function(){formMessage.textContent=""},3000);
});
displayUpdates();
