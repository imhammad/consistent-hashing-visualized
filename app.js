/* =========================================
   1. Math & Hash Function
   ========================================= */
// A simple hashing algorithm that converts any string into a 32-bit integer,
// and then maps it to a 360-degree circle for our visual ring.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Map to 0-359 degrees
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