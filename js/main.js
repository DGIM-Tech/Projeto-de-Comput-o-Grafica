import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 7,90); // ajusta a camera
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;  // Ativa o sombreamento
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Tipo de sombra suave
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

// Adicionando luz ambiente
const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);

// Luz direcional para sombras
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 100, 50);  // Posição da luz no céu
directionalLight.castShadow = true;  // Habilitar a emissão de sombras

// Configuração de sombras da luz direcional
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -150;
directionalLight.shadow.camera.right = 150;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;

scene.add(directionalLight);

// variavel de movimentçao do carro
let moveForward = false; // mover para frente
let moveBackward = false; // mover para atras
let rotateLeft = false;       // para direita
let rotateRight = false;    // para esqueda
let buzina = false // para a buzinha a tecla para buzina vai ser espaço
const moveSpeed = 0.6;          //movimento do carro
const rotateSpeed = 0.05;   // movient para vira para o lados
let selectedCarIndex = 0; // Índice do carro atualmente controlado
const buzinar = new Audio('son/buzina.mp3'); // Carrega o som da buzina
buzinar.volume = 0.2; // Ajusta o volume para 20% (valor entre 0.0 e 1.0)
buzinar.loop = false; // Define se o som deve ser repetido
buzinar.preload = 'auto'; // Garante que o som é carregado automaticamente
let r =65;
let theta = 0;
let phi = Math.PI / 4; // angulo de azimutal

class Carros{


    constructor(modelPath, initialPosition, scale, rotacion){
        this.model = null;
        this.load(modelPath, initialPosition, scale, rotacion);
        this.path = []; // Inicializa path como um array vazio
        this.boundingBox = new THREE.Box3(); // Criar uma caixa delimitadora para o carro
        this.currentPathIndex = 0;
        this.boundaries = { // definino  os limete de onde o carro deve ser mover
        ZMax: 93,
        ZMin: -94,
        XMax: 94,
        XMin: -94,
        };
        
    }
    load(modelPath, initialPosition, scale, rotacion) {
        const loader = new GLTFLoader();
        loader.load(modelPath, (gltf) => {
            this.model = gltf.scene;
            scene.add(this.model);
            console.log('Modelo carregado com sucesso!');
            // this.model.position.set(5, 2.3, +80);
            // this.model.rotation.y -= 3.2;
            // this.model.scale.set(3,3,3);
            this.model.rotation.set(rotacion.x,rotacion.y, rotacion.z) // para totaciona o objeto
            this.model.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
            this.model.scale.set(scale.x, scale.y, scale.z);
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true; // Permitir que o carro emita sombra
                    child.receiveShadow = true; // O carro recebe sombra
                }
            });
        }, undefined, (error) => {
            console.error('Erro ao carregar o modelo:', error);
        });
    }

    moverCar(index,  cenario) {
        if (this.model && index === selectedCarIndex)  {
            const savePosition = this.model.position.clone() /// salva a posiçao anterio para verifca o limitido permitido
            if (moveForward) { // se o teclar da seta para cima for precionada
                this.model.translateZ(+moveSpeed);
            }
            if (moveBackward) { // se a teclar seta para baixo for precionada
                this.model.translateZ(-moveSpeed);
            }
           
            if (moveForward || moveBackward){ // cndiçao para vira esqueda e direita se as tecla de cima e para baixa precionada
                if (rotateLeft ) this.model.rotation.y += rotateSpeed;
                if (rotateRight) this.model.rotation.y -= rotateSpeed;
            }
      
        if (buzina) {
            if (buzinar.paused) { // verica se ta tocando 
                buzinar.currentTime = 0; // Reinicia o som
                buzinar.play(); // Toca o som
                console.log("Buzinando...");
            }
        } else {
            if (!buzinar.paused) {
                buzinar.pause(); // Pausa o som se a tecla for solta
                buzinar.currentTime = 0; // Reinicia o som para a próxima vez
                console.log("Parou de buzinar.");
            }
        
            }  
            if(!this.checkBoundaries()){
            this.model.position.copy(savePosition) // caso saia do limite ele volta para a posiçao anterior
            }

            // Atualizar a bounding box do carro
            this.boundingBox.setFromObject(this.model);
            this.boundingBox.expandByScalar(-0.90); // Reduz a bounding box em todas as direções


            // Verificar colisão com o cenário
            if (this.detectCollision(cenario)) {
                // Se houver colisão, reverter para a posição anterior
                this.model.position.copy(savePosition);
            }
            // Verifica colisões com outros carros
         if (this.detectCollisionWithCars(carros)) {
            this.model.position.copy(savePosition); // Reverter a posição se ocorrer colisão
            }
            camera.position.x = this.model.position.x;
            camera.position.y = this.model.position.y + 40;
            camera.position.z = this.model.position.z ;
            camera.lookAt(this.model.position);
        } else {
            // Movimentação do carro automático
            this.moveAutomatically();
        }
        
    }
    checkBoundaries(){
        const { x, z} = this.model.position;
        const {ZMax, ZMin, XMax, XMin} = this.boundaries;
        return (z >= ZMin && z <= ZMax && x >= XMin && x <= XMax);
    }
    detectFrontCollisionWithCars(carros) {
        const carroBoundingBox = this.boundingBox;
    
        for (let i = 0; i < carros.length; i++) {
            if (carros[i] !== this && carros[i].model) { // Não comparar o carro consigo mesmo
                const otherCarBoundingBox = carros[i].boundingBox.setFromObject(carros[i].model);
                
                // Verificar se há colisão com a bounding box de outro carro
                if (carroBoundingBox.intersectsBox(otherCarBoundingBox)) {
                    // Agora, verificar se a colisão é frontal
                    const directionToOtherCar = new THREE.Vector3().subVectors(carros[i].model.position, this.model.position).normalize();
                    const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.model.quaternion).normalize();
                    
                    // Se o ângulo entre a direção do movimento e a direção do outro carro for pequeno, é uma colisão frontal
                    const angle = forwardDirection.angleTo(directionToOtherCar);
                    const threshold = Math.PI / 4; // Ajuste o limite do ângulo para definir colisão frontal (45 graus)
                    if (angle < threshold) {
                        return true; // Colisão frontal detectada
                    }
                }
            }
        }
    
        return false; // Sem colisão frontal
    }
    moveAutomatically() {
        // Verifica se o modelo foi carregado
        if (!this.model) {
            console.warn("Modelo não carregado ainda.");
            return; // Saia se o modelo ainda não estiver carregado
        }
    
        // Checar se o carro está colidindo com outro carro na frente
        if (this.detectFrontCollisionWithCars(carros)) {
            this.inCollision = true; // Seta o estado de colisão para true
        } else {
            this.inCollision = false; // Se não houver colisão frontal, retorne ao estado normal
        }
    
        // Se houver colisão frontal, o carro para de se mover
        if (this.inCollision) {
            console.log("Carro em colisão frontal, parando...");
            return; // Impede o movimento enquanto está em colisão frontal
        }
    
        // Movimentação automática continua se não houver colisão frontal
        if (!this.path.length) return; // Se path estiver vazio, não faz nada
    
        const target = this.path[this.currentPathIndex];
        if (target) {
            const direction = new THREE.Vector3().subVectors(target, this.model.position).normalize();
            const distance = this.model.position.distanceTo(target);
    
            // Se o carro estiver próximo o suficiente do ponto, muda para o próximo ponto
            if (distance < 1) {
                this.currentPathIndex = (this.currentPathIndex + 1) % this.path.length; // Muda para o próximo ponto
            } else {
                // Move o carro em direção ao ponto alvo
                this.model.position.add(direction.multiplyScalar(0.4)); // Ajustar a velocidade
                this.model.lookAt(target); // Faz o carro olhar para o ponto alvo
            }
        }
    }

    setPath(pathPoints) {
        this.path = pathPoints;
    }
    detectCollision(cenario) {
        const carroBoundingBox = this.boundingBox;

        // Verificar colisão entre o carro e cada parte do cenário
        for (let i = 0; i < cenario.collidableObjects.length; i++) {
            const objectBoundingBox = new THREE.Box3().setFromObject(cenario.collidableObjects[i]);
            if (carroBoundingBox.intersectsBox(objectBoundingBox)) {
                return true; // Colisão detectada
            }
        }

        return false; // Sem colisão
    }
    detectCollisionWithCars(carros) {
        const carroBoundingBox = this.boundingBox;

        for (let i = 0; i < carros.length; i++) {
            if (carros[i] !== this && carros[i].model) { // Não comparar o carro consigo mesmo
                const otherCarBoundingBox = carros[i].boundingBox.setFromObject(carros[i].model);
                if (carroBoundingBox.intersectsBox(otherCarBoundingBox)) {
                    return true; // Colisão entre carros detectada
                }
            }
        }

        return false;
    }
}

class Cenario{
    constructor(){
        this.model = null;
        this.load();
        this.collidableObjects = []; // Array para armazenar os objetos colidíveis do cenário
        this.load();
    }
    load() {
        const loader = new GLTFLoader();
        loader.load('modelo/cenario.glb', (gltf) => {
            this.model = gltf.scene;
            scene.add(this.model);
            console.log('Modelo carregado com sucesso!');
            this.model.position.set(0, 0, 0); // ajsutando a posiçao do cenario no origem
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;  // Ativa sombras
                    child.receiveShadow = true;  // Ativa recebimento de sombras

                    // Verifica se o objeto deve ser colidível
                    this.collidableObjects.push(child);  // Adiciona o objeto à lista de colidíveis
                }
            });
            // this.model.rotation.x = Math.PI / 2; // aplicando um rotçao de 90 grau no eixo x
        }, undefined, (error) => {
            console.error('Erro ao carregar o modelo:', error);
        });
    }
 
}

class Aviao{
    constructor(){
        this.model = null;
        this.load();
        this.r = 68;
        this.theta = 0;
        this.phi = Math.PI / 4;
    }
    load() {
        const loader = new GLTFLoader();
        loader.load('modelo/aviao.glb', (gltf) => {
            this.model = gltf.scene;
            scene.add(this.model);
            console.log('Modelo carregado com sucesso!');
            this.model.position.set(0, 10, 0); // ajsutando a posiçao do cenario no origem
            this.model.scale.set(0.1,0.1,0.1);
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true; // Avião emite sombras
                    child.receiveShadow = true; // Avião recebe sombras
                }
            });
        }, undefined, (error) => {
            console.error('Erro ao carregar o modelo:', error);
        });
    }
    // converte coordenadoas esferica para cartesinas 
    updatePosition() {
        // Converter coordenadas esféricas para cartesianas
        const x = this.r * Math.sin(this.phi) * Math.cos(this.theta);
        const y = this.r * Math.cos(this.phi);
        const z = this.r * Math.sin(this.phi) * Math.sin(this.theta);

        // Atualizar a posição do modelo
        if (this.model) {
            this.model.position.set(x, y + 15, z); // +10 para ajustar a altura

            // Atualizar a orientação do avião para olhar na direção do movimento
            const target = new THREE.Vector3(
                this.r * Math.sin(this.phi) * Math.cos(this.theta -0.1),
                y + 15,
                this.r * Math.sin(this.phi) * Math.sin(this.theta - 0.1)
            );
            this.model.lookAt(target);
        }
    }

    moveForwardAutomatic() {
        // Aumenta o ângulo azimutal e controla a elevação para um movimento automático
        this.theta += 0.01; // Controla o movimento horizontal
        if (this.theta > Math.PI * 2) this.theta -= Math.PI * 2; // Loop completo horizontal

        // Controle de subida e descida automático (opcional)
        this.phi += 0.005; // Muda a inclinação para cima ou para baixo
        if (this.phi > Math.PI / 2) this.phi = Math.PI / 2; // Limitar para não passar 90 graus
        if (this.phi < 0) this.phi = 0; // Limitar para não ir abaixo do chão
    }
 
}

const aviao = new Aviao();

const cenario = new Cenario()
// Adicionando luz ambiente e direcional
// const light = new THREE.AmbientLight(0xffffff, 1);
// scene.add(light);

// const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
// directionalLight.position.set(1, 1, 1).normalize();
// scene.add(directionalLight);

const carro1 = new Carros('modelo/carro2.glb', new THREE.Vector3(5, 2.3, 85), new THREE.Vector3(3, 3, 3), new THREE.Vector3(0, -3.15, 0));
const carros = [carro1];

// Carro que se movimenta automaticamente
const carro2 = new Carros('modelo/carro.glb', new THREE.Vector3(5, 2.3, 10), new THREE.Vector3(3, 3, 3), new THREE.Vector3(0, -3.2, 0));
carro2.setPath([
    new THREE.Vector3(5, 2.3, 65),   // Ponto inicial
    new THREE.Vector3(65, 2.3, 65),  // Ponto 1 (direita)
    new THREE.Vector3(65, 2.3, -5), // Ponto 2 (cima)
    new THREE.Vector3(5, 2.3, -5),   // Ponto 3 (esquerda)
    new THREE.Vector3(5, 2.3, 65), // para  Ponto 4 (baixo)
    new THREE.Vector3(-65, 2.3, 65), //para direita
    new THREE.Vector3(-65, 2.3, -5), //para direita  para cima
    new THREE.Vector3(5, 2.3, -5), // para direita
    
]);
carros.push(carro2);

const carro3 = new Carros('modelo/carro3.glb', new THREE.Vector3(5, 2.3, -15), new THREE.Vector3(3, 3, 3), new THREE.Vector3(0, -3.2, 0));
carro3.setPath([
     new THREE.Vector3(5, 2.3, -15),   // Ponto inicial
    new THREE.Vector3(5, 2.3, -55),  // Ponto 1 (frente)
     new THREE.Vector3(-55, 2.3, -55), // Ponto 2 (esqueda)
    new THREE.Vector3(-55, 2.3, -5),   // Ponto 3 (frente)
    new THREE.Vector3(5, 2.3, -5), // para  Ponto 4 (lado)
    new THREE.Vector3(5, 2.3, -55),
    new THREE.Vector3(55, 2.3, -55), 
    new THREE.Vector3(55, 2.3, 55), 
    new THREE.Vector3(-5, 2.3, 55),
    new THREE.Vector3(-5, 2.3, -15),

    
]);
carros.push(carro3);

let timeOfDay = 0; // Controla o ciclo de dia e noite.


// Definir valores para simular o ciclo de dia e noite
const maxLightIntensity = 1;  // Intensidade máxima da luz (dia)
const minLightIntensity = 0.1;  // Intensidade mínima da luz (noite)
const dayDuration = Math.PI * 2;  // Um ciclo completo de dia-noite
let ambientLightColor = new THREE.Color(0x666699); // Cor do céu (crepúsculo)
function animate() {
    requestAnimationFrame(animate);
    // Mover apenas o carro selecionado
      // Simular o ciclo de dia e noite
      const normalizedTime = (Math.sin(timeOfDay) + 1) / 2;  // Normaliza para 0 a 1
      light.intensity = minLightIntensity + (maxLightIntensity - minLightIntensity) * normalizedTime;
      
      // Mudar a cor do fundo para simular o céu mudando de cor
      scene.background = new THREE.Color(
          ambientLightColor.r * normalizedTime,
          ambientLightColor.g * normalizedTime,
          ambientLightColor.b * normalizedTime
      );
    carros.forEach((carro, index) => {
        carro.moverCar(index, cenario);
    });
    aviao.moveForwardAutomatic();
    aviao.updatePosition();
     // Atualizar a posição da luz direcional para simular o movimento do sol
     timeOfDay += 0.003;  // Controle a velocidade da passagem do tempo aumentando ou diminuindo o valor
     directionalLight.position.x = 100 * Math.cos(timeOfDay);  // Movimento circular no eixo X
     directionalLight.position.z = 100 * Math.sin(timeOfDay);  // Movimento circular no eixo Z
     directionalLight.position.y = 50 + 30 * Math.sin(timeOfDay); // Ajusta a altura para imitar o nascer e o pôr do sol
     
     // Garantir que a luz esteja sempre olhando para o centro da cena
     directionalLight.target.position.set(0, 0, 0);
     directionalLight.target.updateMatrixWorld();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// para evento de preciona tecla 

window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'ArrowUp':
             moveForward = true; 
            break;
        case 'ArrowDown': 
            moveBackward = true;
            break;
        case 'ArrowLeft':
             rotateLeft = true; 
             break;
        case 'ArrowRight': 
            rotateRight = true; 
            break;
        case 'Space': 
            buzina = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'ArrowUp': 
            moveForward = false; 
                break;
        case 'ArrowDown': 
            moveBackward = false; 
            break;
        case 'ArrowLeft': 
            rotateLeft = false; 
            break;
        case 'ArrowRight': 
            rotateRight = false; 
            break;
        case 'Space': 
            buzina = false;
            break;
    }
});