document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent immediate navigation

    // Add the animation class to the body
    document.body.classList.add('animate-out');

    // Wait for the animation to complete, then navigate
    setTimeout(() => {
      window.location.href = link.href;
    }, 200); // Match this delay with the animation duration
  });
});

const sidebar = document.querySelector('.most-upper-head-div');

document.addEventListener('mousemove', function(e) {
  if (e.clientX > 220) {
    sidebar ? sidebar.classList.remove('hidden') : '';
  }
})

const topbarButt = document.querySelector('.topbarButt');
if (topbarButt) {
  topbarButt.addEventListener('click', function() {
    sidebar.classList.add('hidden');
  })
}

//const serverIP = 'ipower-backend-production.up.railway.app';
//const serverIP = `http://${window.location.hostname}:3000`;
const serverIP = '';
//const serverIP = 'https://pos.biggroups.org'


const returnIcon = document.querySelector('.fa-arrow-left');
returnIcon?.addEventListener('click', function() {
  window.history.back();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    window.history.back()
  };
})

const compInp = document.querySelector('.comp-inp');
if (compInp) {
  compInp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      localStorage.setItem('computerVal', compInp.value.trim());
      alert(`${compInp.value.trim()} saved`);
    }
  })
  
  compInp.value = localStorage.getItem('computerVal') || '';
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

function checkPassword(href) {
  const userInp = prompt('Enter password: ');
  userInp === '0.0.0.' ? window.location.href = href: 
  alert('The password is incorrect');
}

setInterval(async () => {
  await fetch(`${serverIP}/select1`);

}, 30000);
