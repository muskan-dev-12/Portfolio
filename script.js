var lb=document.getElementById("lb"),li=lb.querySelector("img");
document.querySelectorAll(".cert button").forEach(function(b){b.addEventListener("click",function(){li.src=b.querySelector("img").src;lb.hidden=false})});
lb.addEventListener("click",function(){lb.hidden=true});
document.addEventListener("keydown",function(e){if(e.key==="Escape")lb.hidden=true});
