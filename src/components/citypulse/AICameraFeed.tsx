import { useRef, useEffect, useState } from "react";
import * as ort from "onnxruntime-web";
import { X, Play, Pause, Camera } from "lucide-react";

// Clases de YOLOv8 que nos interesan (Vehículos según dataset COCO)
const VEHICLE_CLASSES = [2, 3, 5, 7]; // 2: coche, 3: moto, 5: autobús, 7: camión

export function AICameraFeed({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicleCount, setVehicleCount] = useState(0);
  
  // Referencia para el tracker que estabilizará las cajas entre frames
  const trackersRef = useRef<Array<{ id: number, x: number, y: number, w: number, h: number, prob: number, missed: number }>>([]);
  const nextIdRef = useRef(1);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Cargar el modelo YOLO
  useEffect(() => {
    async function loadModel() {
      try {
        // La versión del motor debe coincidir EXACTAMENTE con la instalada en package.json (1.25.1)
        ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.1/dist/";
        
        console.log("Cargando modelo YOLO...");
        const sess = await ort.InferenceSession.create("/yolov8n.onnx", {
          executionProviders: ["wasm"],
        });
        setSession(sess);
        setLoading(false);
        console.log("Modelo cargado correctamente");
      } catch (e: any) {
        console.error("Error cargando el modelo YOLO:", e);
        setErrorMsg(e.message || "Error al cargar yolov8n.onnx. Verifica la consola.");
        setLoading(false);
      }
    }
    loadModel();
  }, []);

  // 2. Bucle de inferencia (procesar cada frame)
  useEffect(() => {
    let animationId: number;

      async function detectFrame() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // Esperar a que el vídeo tenga dimensiones válidas
        if (!video || !canvas || !session || video.paused || video.ended || video.videoWidth === 0 || video.videoHeight === 0) {
          animationId = requestAnimationFrame(detectFrame);
          return;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Ajustar canvas al tamaño del vídeo
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Pre-procesado: YOLOv8 necesita imágenes de 640x640
        const targetSize = 640;
      
        // Canvas oculto para capturar el frame exacto y que no se desincronice
        const captureCanvas = document.createElement("canvas");
        captureCanvas.width = canvas.width;
        captureCanvas.height = canvas.height;
        const captureCtx = captureCanvas.getContext("2d");
        if (!captureCtx) return;
        captureCtx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const offscreen = document.createElement("canvas");
        offscreen.width = targetSize;
        offscreen.height = targetSize;
        const offCtx = offscreen.getContext("2d");
        if (!offCtx) return;

        // Dibujamos el frame capturado al tamaño de la IA
        offCtx.drawImage(captureCanvas, 0, 0, targetSize, targetSize);
        const imgData = offCtx.getImageData(0, 0, targetSize, targetSize);
        const pixels = imgData.data;

        // Convertir a Float32Array y normalizar [0-1] (Formato NCHW)
        const float32Data = new Float32Array(3 * targetSize * targetSize);
        for (let i = 0; i < pixels.length / 4; i++) {
          float32Data[i] = pixels[i * 4] / 255.0; // R
          float32Data[targetSize * targetSize + i] = pixels[i * 4 + 1] / 255.0; // G
          float32Data[2 * targetSize * targetSize + i] = pixels[i * 4 + 2] / 255.0; // B
        }

        const tensor = new ort.Tensor("float32", float32Data, [1, 3, targetSize, targetSize]);

        try {
          // Ejecutar IA (Usamos dinámicamente el nombre de la capa de entrada del modelo)
          const inputName = session.inputNames[0];
          const results = await session.run({ [inputName]: tensor });
          
          // La salida suele estar en output0, o buscamos el primer nombre de salida
          const outputName = session.outputNames[0];
          const output = results[outputName].data as Float32Array; 
          
          // Post-procesado: Analizar la salida
          const dims = results[outputName].dims;
          const isTransposed = dims[1] === 8400 || dims[1] > dims[2]; // si es [1, 8400, 84]
          const numBoxes = isTransposed ? dims[1] : dims[2]; // usualmente 8400
          const numClasses = (isTransposed ? dims[2] : dims[1]) - 4; // 84 - 4 = 80
          
          const boxes = [];
          const threshold = 0.12; // Umbral bajo para la vista de pájaro
          let globalMaxProb = 0;

          for (let i = 0; i < numBoxes; i++) {
            let maxClass = -1;
            let maxProb = 0;

            // Extraer probabilidades de las clases
            for (let c = 0; c < numClasses; c++) {
              const actualProb = isTransposed 
                ? output[i * (numClasses + 4) + 4 + c] 
                : output[(4 + c) * numBoxes + i];

              if (actualProb > maxProb) {
                maxProb = actualProb;
                maxClass = c;
              }
            }

            if (maxProb > globalMaxProb) globalMaxProb = maxProb;

            // Filtramos solo vehículos con un umbral bajo
            if (maxProb > threshold && VEHICLE_CLASSES.includes(maxClass)) {
              const xc = isTransposed ? output[i * (numClasses + 4) + 0] : output[0 * numBoxes + i];
              const yc = isTransposed ? output[i * (numClasses + 4) + 1] : output[1 * numBoxes + i];
              const w = isTransposed ? output[i * (numClasses + 4) + 2] : output[2 * numBoxes + i];
              const h = isTransposed ? output[i * (numClasses + 4) + 3] : output[3 * numBoxes + i];

              // Re-escalar a las dimensiones del vídeo original
              const scaleX = canvas.width / targetSize;
              const scaleY = canvas.height / targetSize;

              boxes.push({
                x: (xc - w / 2) * scaleX,
                y: (yc - h / 2) * scaleY,
                w: w * scaleX,
                h: h * scaleY,
                prob: maxProb,
                classId: maxClass,
              });
            }
          }

          // Aplicar NMS
          const finalBoxes = applyNMS(boxes, 0.40);

          // --- SISTEMA DE TRACKING VISUAL (Evita que las cajas desaparezcan/parpadeen) ---
          const currentTrackers = trackersRef.current;
          const newTrackers: typeof currentTrackers = [];
          
          currentTrackers.forEach(t => t.missed++); // Envejecer todos los trackers

          for (const b of finalBoxes) {
            let matched = false;
            let bestTracker = null;
            let minDistance = 150; // Píxeles máximos de salto permitidos entre fotogramas

            for (const t of currentTrackers) {
              const cxA = b.x + b.w / 2;
              const cyA = b.y + b.h / 2;
              const cxB = t.x + t.w / 2;
              const cyB = t.y + t.h / 2;
              const dist = Math.sqrt((cxA - cxB)**2 + (cyA - cyB)**2);

              if (dist < minDistance) {
                minDistance = dist;
                bestTracker = t;
              }
            }

            if (bestTracker) {
              // Interpolar posición para movimiento súper suave (EMA)
              const alpha = 0.5;
              bestTracker.x = bestTracker.x * (1 - alpha) + b.x * alpha;
              bestTracker.y = bestTracker.y * (1 - alpha) + b.y * alpha;
              bestTracker.w = bestTracker.w * (1 - alpha) + b.w * alpha;
              bestTracker.h = bestTracker.h * (1 - alpha) + b.h * alpha;
              bestTracker.prob = b.prob;
              bestTracker.missed = 0;
              matched = true;
            }

            if (!matched) {
              newTrackers.push({
                id: nextIdRef.current++,
                x: b.x, y: b.y, w: b.w, h: b.h,
                prob: b.prob, missed: 0
              });
            }
          }

          // Mantener los "fantasmas" de los coches que YOLO pierde durante unos frames
          const MAX_MISSED = 8;
          for (const t of currentTrackers) {
            if (t.missed === 0 || (t.missed > 0 && t.missed < MAX_MISSED)) {
              if (t.missed > 0) newTrackers.push(t);
              else if (!newTrackers.find(nt => nt.id === t.id)) newTrackers.push(t); // ya añadido si fue matcheado, wait logic:
            }
          }
          
          // Limpiar duplicados lógicos
          const uniqueTrackers = new Map();
          newTrackers.forEach(t => uniqueTrackers.set(t.id, t));
          trackersRef.current = Array.from(uniqueTrackers.values());

          // Solo contamos como "activos en pantalla" a los que lleven menos de 3 fotogramas perdidos
          const activeBoxes = trackersRef.current.filter(t => t.missed < 3);
          setVehicleCount(activeBoxes.length); // Actualizar contador estabilizado

          // --- RENDERIZADO SIN PARPADEO ---
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(captureCanvas, 0, 0, canvas.width, canvas.height);

          // 3. Dibujamos las cajas estabilizadas
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#3b82f6"; // Azul
          ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
          ctx.font = "14px monospace";

          for (const b of activeBoxes) {
            ctx.beginPath();
            ctx.rect(b.x, b.y, b.w, b.h);
            ctx.stroke();
            ctx.fill();

            // Fondo del texto
            ctx.fillStyle = "#3b82f6";
            const label = `VEHÍCULO #${b.id} ${(b.prob * 100).toFixed(0)}%`;
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(b.x, b.y - 20, textWidth + 8, 20);

            // Texto
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, b.x + 4, b.y - 6);
            ctx.fillStyle = "rgba(59, 130, 246, 0.3)"; // Restaurar
          }
        } catch (err: any) {
        console.error("Error en inferencia:", err);
      }

      // Procesar siguiente frame (podríamos usar setTimeout para no saturar)
      animationId = requestAnimationFrame(detectFrame);
    }

    if (isPlaying) {
      detectFrame();
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, session]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-5xl rounded-xl border border-panel-border bg-panel shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-panel-border bg-background/50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="text-lg font-semibold tracking-tight">CCTV IA · Detección de Vehículos en Vivo</h2>
            {loading && <span className="text-xs text-muted-foreground ml-2">(Inicializando modelo neuronal...)</span>}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black flex-1 min-h-[500px] flex items-center justify-center overflow-hidden">
          {/* El vídeo real se oculta, solo mostramos el canvas pintado encima */}
          <video
            ref={videoRef}
            src="/traffic.mp4"
            className="hidden"
            loop
            muted
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[70vh] object-contain"
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-panel/90 backdrop-blur border border-panel-border px-8 py-3 rounded-full shadow-lg">
            <div className="flex items-center gap-4">
              <button
                className="flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 w-12 h-12 transition-colors disabled:opacity-50"
                onClick={togglePlay}
                disabled={loading}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              <div className="flex flex-col text-sm border-r border-panel-border pr-6">
                <span className="font-mono text-primary font-semibold">
                  {errorMsg ? <span className="text-destructive font-bold">ERROR</span> : loading ? "CARGANDO MODELO" : isPlaying ? "ANALIZANDO TRÁFICO..." : "EN ESPERA"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {errorMsg ? <span className="text-destructive">{errorMsg}</span> : "Motor: YOLOv8 Nano · ONNX Web"}
                </span>
              </div>
            </div>
            
            {/* Contador de vehículos */}
            <div className="flex flex-col items-center justify-center pl-2">
              <div className="text-2xl font-bold tabular-nums leading-none text-foreground">
                {vehicleCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                Vehículos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Función auxiliar para eliminar predicciones redundantes
function applyNMS(boxes: any[], iouThreshold: number) {
  if (boxes.length === 0) return [];
  boxes.sort((a, b) => b.prob - a.prob);
  const selected = [];
  const active = new Array(boxes.length).fill(true);

  for (let i = 0; i < boxes.length; i++) {
    if (!active[i]) continue;
    selected.push(boxes[i]);
    for (let j = i + 1; j < boxes.length; j++) {
      if (!active[j]) continue;
      const boxA = boxes[i], boxB = boxes[j];
      const xA = Math.max(boxA.x, boxB.x), yA = Math.max(boxA.y, boxB.y);
      const xB = Math.min(boxA.x + boxA.w, boxB.x + boxB.w), yB = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);
      const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
      const iou = interArea / (boxA.w * boxA.h + boxB.w * boxB.h - interArea);
      if (iou > iouThreshold) active[j] = false;
    }
  }
  return selected;
}
