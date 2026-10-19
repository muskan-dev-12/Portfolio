(function(){
  const root=document.documentElement;
  const theme=document.getElementById('theme');
  const saved=localStorage.getItem('muskan-theme');
  if(saved==='light') root.setAttribute('data-theme','light');
  function sync(){theme.textContent=root.getAttribute('data-theme')==='light'?'☾':'☼';}
  sync();
  theme.addEventListener('click',()=>{const light=root.getAttribute('data-theme')==='light'; if(light) root.removeAttribute('data-theme'); else root.setAttribute('data-theme','light'); localStorage.setItem('muskan-theme',light?'dark':'light'); sync();});

  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('show')}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  const modal=document.getElementById('modal'), modalImg=document.getElementById('modal-img');
  document.querySelectorAll('.cert-card').forEach(card=>card.addEventListener('click',()=>requireLogin(()=>{modalImg.src='/files/'+encodeURIComponent(card.dataset.cert);modal.hidden=false;})));
  document.querySelector('.modal-close').addEventListener('click',()=>modal.hidden=true);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.hidden=true});

  const rot=document.getElementById('rotator');
  if(rot){
    const words=['Aspiring DevOps Engineer','Docker. Jenkins. Linux.','Learning in public'];
    let i=0;
    setInterval(()=>{
      rot.classList.add('out');
      setTimeout(()=>{i=(i+1)%words.length;rot.textContent=words[i];rot.classList.remove('out');},450);
    },2600);
  }
})();
