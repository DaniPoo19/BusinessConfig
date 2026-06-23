// Simple JS script to run in browser console to test
fetch('http://localhost:8080/api/v1/admin/billing/plans?active_only=false', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token') // roughly
  }
}).then(r => r.json()).then(console.log);
