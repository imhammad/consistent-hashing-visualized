  <div align="center">
    
  # Consistent Hashing Visualized
  
  A high-performance, interactive visualizer explaining how modern distributed caches and databases scale horizontally without rehashing all their data.
  </div>
  
  https://github.com/user-attachments/assets/9467ef84-23aa-4715-86ee-f223cb0c40ae



### Live Demo
[**Click here to view the live visualization**](https://imhammad.github.io/consistent-hashing-visualized/)

## Why I Built This
I firmly believe that if you truly understand a complex Computer Science concept, you should be able to explain it simply. I learn best by building visual tools. Consistent Hashing is a brilliant system design pattern, but reading pseudocode about it can be confusing. I built this interactive web engine to let developers actually *see* a cache stampede being prevented in real time. By allowing users to dynamically add or drop servers on the fly, the elegance of the key redistribution finally clicks. Ultimately, my hope is that this hands-on experience bridges the gap between abstract theory and practical understanding.

## How It Works (The Logic)
Instead of standard modulo hashing (`hash(key) % N`), which forces almost all data to find a new home when a single server crashes, this algorithm maps both servers and data onto the same 360-degree mathematical ring. 

* **The Hash Function:** I used the **FNV-1a algorithm** instead of a basic string hash. FNV-1a has a high "avalanche effect", meaning it scatters similarly named servers evenly across the ring to prevent physical clustering.
* **Key Routing:** When data is inserted, it hashes to a degree on the ring and travels clockwise to connect to the nearest server node.
* **Virtual Nodes (Replicas):** Physical servers are represented by multiple smaller "virtual" nodes. This distributes the load uniformly and prevents hot spots.

## Tech Stack & Implementation
I chose to build this without heavy frameworks. 
* **Vanilla JavaScript:** Handles the FNV-1a math, the ring data structure, and the routing logic.
* **HTML5 Canvas & requestAnimationFrame:** Used to render the 60FPS animations, pulsing glows, and dynamic data streams mathematically, ensuring maximum browser performance.
* **CSS3:** Custom dark-mode terminal UI built with native CSS Grid and Flexbox and the responsive designing.

## Run It Locally
1. Clone the repository:
   `git clone https://github.com/YOUR_USERNAME/consistent-hashing-visualized.git`
2. Navigate to the directory:
   `cd consistent-hashing-visualized`
3. Open `index.html` in any modern web browser. No build steps or servers required.
