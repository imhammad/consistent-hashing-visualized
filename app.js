/* =========================================
   1. Math & Hash Function
   ========================================= */
// A simple hashing algorithm that converts any string into a 32-bit integer,
// and then maps it to a 360-degree circle for our visual ring.
function hashString(str) {
  // FNV-1a Hash Algorithm: 
  // Brilliantly scatters similar strings across the ring randomly.
  let hash = 2166136261; 
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // Math.imul safely does 32-bit integer multiplication
    hash = Math.imul(hash, 16777619); 
  }
  return Math.abs(hash) % 360;
}

/* =========================================
   2. The Consistent Hash Ring Data Structure
   ========================================= */
class ConsistentHashRing {
  constructor(virtualNodesPerServer = 3) {
    this.virtualNodesPerServer = virtualNodesPerServer;
    
    // The Ring: A sorted array of physical and virtual nodes
    // Shape: { hash: number, nodeName: string, isVirtual: boolean }
    this.ring = []; 
    
    // Track active physical servers
    this.activeServers = new Set(); 
    
    // Track our data keys
    // Shape: { id: string, hash: number, assignedServer: string }
    this.keys = []; 
  }

  addServer(serverName) {
    if (this.activeServers.has(serverName)) return;
    this.activeServers.add(serverName);

    // 1. Add the Physical Node to the ring
    this.ring.push({
      hash: hashString(serverName),
      nodeName: serverName,
      isVirtual: false
    });

    // 2. Add Virtual Nodes (Replicas) to distribute load evenly
    for (let i = 0; i < this.virtualNodesPerServer; i++) {
      this.ring.push({
        hash: hashString(serverName + "-vnode-" + i),
        nodeName: serverName,
        isVirtual: true
      });
    }

    // 3. Sort the ring by hash (degrees) so we can walk it clockwise
    this.ring.sort((a, b) => a.hash - b.hash);
    
    // 4. Re-evaluate existing keys to see if they should move to the new server
    return this.recalculateKeys();
  }

  removeServer(serverName) {
    if (!this.activeServers.has(serverName)) return;
    this.activeServers.delete(serverName);
    
    // Remove all physical and virtual nodes associated with this server
    this.ring = this.ring.filter(n => n.nodeName !== serverName);
    
    // Re-evaluate keys (keys on the dead server will map to the next available one)
    return this.recalculateKeys();
  }

  addDataKey(keyId) {
    const keyHash = hashString(keyId);
    const assignedServer = this.getServerForKeyHash(keyHash);
    
    this.keys.push({
      id: keyId,
      hash: keyHash,
      assignedServer: assignedServer
    });

    return assignedServer;
  }

  // THE MAGIC: How a key finds its server
  getServerForKeyHash(keyHash) {
    if (this.ring.length === 0) return null;
    
    // Walk the ring clockwise to find the first server with a hash >= the key's hash
    for (let i = 0; i < this.ring.length; i++) {
      if (this.ring[i].hash >= keyHash) {
        return this.ring[i].nodeName;
      }
    }
    
    // If we go past the end of the array, wrap around to the very first server
    return this.ring[0].nodeName;
  }

  recalculateKeys() {
    let remappedCount = 0;
    
    this.keys.forEach(key => {
      const newServer = this.getServerForKeyHash(key.hash);
      if (key.assignedServer !== newServer) {
        key.assignedServer = newServer;
        remappedCount++;
      }
    });
    
    // In a normal modulo hash, adding a server remaps almost 100% of keys.
    // Consistent hashing only remaps a small fraction (k/N)!
    return remappedCount;
  }
}

// Initialize the global cluster state
const cluster = new ConsistentHashRing(3);

/* =========================================
   3. DOM Elements & State Setup
   ========================================= */
const canvas = document.getElementById('ringCanvas');
const ctx = canvas.getContext('2d');
const CENTER = canvas.width / 2;
const RADIUS = 220;

const btnAddNode = document.getElementById('btn-add-node');
const inputNode = document.getElementById('node-name');
const btnAddKey = document.getElementById('btn-add-key');
const inputKey = document.getElementById('key-input');
const btnRandomKeys = document.getElementById('btn-add-random-keys');
const btnReset = document.getElementById('btn-reset');
const toggleVnodes = document.getElementById('virtual-nodes-toggle');

/* =========================================
   4. Canvas Rendering Engine
   ========================================= */
/* =========================================
   4. Canvas Rendering Engine (ANIMATED)
   ========================================= */
let animationTime = 0;

function drawRing() {
  animationTime += 0.015;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw the Base Ring
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Draw Data Keys & Flowing Connections
  cluster.keys.forEach(key => {
    const keyRad = (key.hash - 90) * (Math.PI / 180);
    const keyX = CENTER + (RADIUS - 30) * Math.cos(keyRad);
    const keyY = CENTER + (RADIUS - 30) * Math.sin(keyRad);

    // Find assigned server for connection line
    const server = cluster.ring.find(n => n.nodeName === key.assignedServer);
    if (server) {
      const srvRad = (server.hash - 90) * (Math.PI / 180);
      const srvX = CENTER + RADIUS * Math.cos(srvRad);
      const srvY = CENTER + RADIUS * Math.sin(srvRad);

      // Draw Animated Data Stream
      ctx.beginPath();
      ctx.moveTo(keyX, keyY);
      ctx.quadraticCurveTo(CENTER, CENTER, srvX, srvY);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.setLineDash([4, 12]);
      ctx.lineDashOffset = -animationTime * 50; // This makes the line "flow"
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]); // Reset for other shapes
    }

    // Draw Glowing Key
    ctx.beginPath();
    ctx.arc(keyX, keyY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    // Pulsing effect based on time
    ctx.shadowBlur = 10 + Math.sin(animationTime * 5) * 5; 
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // 3. Draw Servers (Nodes)
  cluster.ring.forEach(node => {
    if (node.isVirtual && !toggleVnodes.checked) return;

    const rad = (node.hash - 90) * (Math.PI / 180);
    const x = CENTER + RADIUS * Math.cos(rad);
    const y = CENTER + RADIUS * Math.sin(rad);

    ctx.beginPath();
    ctx.arc(x, y, node.isVirtual ? 4 : 8, 0, 2 * Math.PI);
    ctx.fillStyle = node.isVirtual ? '#374151' : '#06b6d4';
    ctx.fill();
    ctx.strokeStyle = node.isVirtual ? '#06b6d4' : '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Loop the animation
  requestAnimationFrame(drawRing);
}

// Start the loop once
requestAnimationFrame(drawRing);

/* =========================================
   5. UI Updates & Event Listeners
   ========================================= */
function updateUI(remappedCount = 0) {
  
  // Update Top Stats
  document.getElementById('stat-total-keys').innerText = cluster.keys.length;
  document.getElementById('node-count').innerText = cluster.activeServers.size;
  
  const remapEl = document.getElementById('stat-remapped-keys');
  remapEl.innerText = remappedCount;
  // Flash red if a massive remapping event occurred
  remapEl.style.color = remappedCount > 0 ? '#f43f5e' : '#9ca3af';
  setTimeout(() => remapEl.style.color = '', 500);

  // Render Node Chips (Allows user to delete specific servers)
  const chipsContainer = document.getElementById('node-chips');
  chipsContainer.innerHTML = '';
  cluster.activeServers.forEach(server => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `${server} <span class="chip-remove" onclick="removeServerUI('${server}')">×</span>`;
    chipsContainer.appendChild(chip);
  });

  // Calculate and Render Load Distribution Bars
  const loadContainer = document.getElementById('load-bars');
  if (cluster.activeServers.size === 0) {
    loadContainer.innerHTML = '<p class="empty-state">No servers added yet</p>';
  } else {
    loadContainer.innerHTML = '';
    const loadMap = {};
    cluster.activeServers.forEach(s => loadMap[s] = 0);
    cluster.keys.forEach(k => {
      if (loadMap[k.assignedServer] !== undefined) loadMap[k.assignedServer]++;
    });

    const totalKeys = cluster.keys.length || 1; // prevent division by zero
    for (const [server, count] of Object.entries(loadMap)) {
      const pct = Math.round((count / totalKeys) * 100);
      loadContainer.innerHTML += `
        <div class="load-bar-item">
          <div class="load-bar-header">
            <span>${server}</span>
            <span>${count} keys (${pct}%)</span>
          </div>
          <div class="load-bar-track">
            <div class="load-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }
  }
}

function logEvent(msg, type = 'normal') {
  const log = document.getElementById('event-log');
  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
  const cssClass = type === 'add' ? 'log-action' : (type === 'remove' ? 'log-action removed' : '');
  
  // Prepend to top of log
  log.innerHTML = `<div class="log-entry"><span class="log-time">[${time}]</span> <span class="${cssClass}">${msg}</span></div>` + log.innerHTML;
}

// Global function so the inline HTML "onclick" inside the chips can access it
window.removeServerUI = function(serverName) {
  const remapped = cluster.removeServer(serverName);
  logEvent(`Server ${serverName} crashed/removed. ${remapped} keys remapped.`, 'remove');
  updateUI(remapped);
};

/* --- Button Event Listeners --- */
btnAddNode.addEventListener('click', () => {
  const name = inputNode.value.trim() || `Server-${String.fromCharCode(65 + cluster.activeServers.size)}`;
  if (cluster.activeServers.has(name)) return alert("Server already exists!");
  
  const remapped = cluster.addServer(name);
  logEvent(`Server ${name} joined cluster. ${remapped} keys safely remapped.`, 'add');
  inputNode.value = '';
  updateUI(remapped);
});

btnAddKey.addEventListener('click', () => {
  if (cluster.activeServers.size === 0) return alert("Spin up a server node first!");
  const keyId = inputKey.value.trim() || `user_${Math.floor(Math.random()*1000)}`;
  const assigned = cluster.addDataKey(keyId);
  logEvent(`Key [${keyId}] routed to [${assigned}]`);
  inputKey.value = '';
  updateUI(0);
});

btnRandomKeys.addEventListener('click', () => {
  if (cluster.activeServers.size === 0) return alert("Spin up a server node first!");
  for(let i=0; i<10; i++) {
    cluster.addDataKey(`data_${Math.floor(Math.random()*9999)}`);
  }
  logEvent(`Batch inserted 10 random data keys.`);
  updateUI(0);
});

btnReset.addEventListener('click', () => {
  cluster.ring = [];
  cluster.activeServers.clear();
  cluster.keys = [];
  document.getElementById('event-log').innerHTML = '';
  updateUI(0);
});

toggleVnodes.addEventListener('change', () => {
  cluster.virtualNodesPerServer = toggleVnodes.checked ? 3 : 0;
  // Rebuild the entire ring with or without replicas
  const currentServers = Array.from(cluster.activeServers);
  cluster.ring = [];
  cluster.activeServers.clear();
  currentServers.forEach(s => cluster.addServer(s)); 
  
  logEvent(`Virtual nodes ${toggleVnodes.checked ? 'enabled' : 'disabled'}. Ring re-hashed.`);
  updateUI(cluster.recalculateKeys());
});


updateUI();