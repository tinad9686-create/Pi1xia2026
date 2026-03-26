
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classifyPlayer, generateAvatarStyle, analyzeDrive } from '../services/geminiService';
import { detectPose, base64ToImage } from '../services/poseService';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { ClassificationResult, PlayerProfile, SkillGroup, MatchHistory, DriveAnalysisResult } from '../types';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Props {
  profile: PlayerProfile;
  onUpdate: (profile: PlayerProfile) => void;
  onRequireAuth?: () => boolean; // Returns true if auth was required and handled
  onUpgrade?: () => void;
  isAdmin?: boolean;
}

const PICKLEBALL_TERMS = [
  'dink', 'volley', 'smash', 'serve', 'return', 'third shot drop', 
  'kitchen', 'baseline', 'lob', 'reset', 'drive', 'cross-court', 
  'overhead', 'poaching', 'rally', 'dinking', 'stacking', 'unforced error'
];

interface TooltipProps {
  content: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content }) => (
  <div className="group relative inline-block ml-1 z-[50]">
    <i className="fas fa-circle-info text-[10px] text-lime-400/40 hover:text-lime-400 transition-colors cursor-help"></i>
    {/* Tooltip Popup */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-72 p-4 bg-black/95 backdrop-blur-md text-white text-[10px] rounded-xl shadow-2xl border border-white/10 leading-relaxed font-medium tracking-normal">
      {content}
      {/* Arrow / Hover Bridge */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/95"></div>
    </div>
  </div>
);

type Point = { x: number, y: number };
type Path = { points: Point[], color: string };

// Math helper to calculate angle between three points (p2 is the vertex)
const calculateAngle = (p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}) => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    return angle;
};

// Logic to determine the coaching alert based on the pose
const getCoachingAlerts = (pose: poseDetection.Pose | undefined) => {
    if (!pose || !pose.keypoints) {
        return [{ metric: 'Stance', status: 'UNKNOWN', alert: 'SCANNING', color: 'text-gray-400', borderColor: 'border-gray-500/50', bg: 'bg-gray-500/10', iconColor: 'text-gray-400', shadowColor: 'rgba(156,163,175,1)' }];
    }

    const alerts = [];
    const findKp = (name: string) => pose.keypoints.find(k => k.name === name);
    
    // 1. KNEE ANGLE
    let hip = findKp('right_hip');
    let knee = findKp('right_knee');
    let ankle = findKp('right_ankle');
    
    // Fallback to left if right is not visible enough
    if (!hip || !knee || !ankle || ((hip.score || 0) < 0.3 && (knee.score || 0) < 0.3)) {
        hip = findKp('left_hip');
        knee = findKp('left_knee');
        ankle = findKp('left_ankle');
    }

    if (hip && knee && ankle && (hip.score || 0) > 0.2 && (knee.score || 0) > 0.2 && (ankle.score || 0) > 0.2) {
        const angle = calculateAngle(hip, knee, ankle);
        
        if (angle > 130) {
            alerts.push({ metric: 'Knees', status: `${Math.round(angle)}°`, alert: 'BEND', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
        } else if (angle < 110) {
            alerts.push({ metric: 'Knees', status: `${Math.round(angle)}°`, alert: 'RAISE', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
        } else {
            alerts.push({ metric: 'Knees', status: `${Math.round(angle)}°`, alert: 'OPTIMAL', color: 'text-[#39ff14]', borderColor: 'border-[#39ff14]/50', bg: 'bg-[#39ff14]/10', iconColor: 'text-[#39ff14]', shadowColor: 'rgba(57,255,20,1)', isGood: true });
        }
    } else {
        alerts.push({ metric: 'Knees', status: 'MISSING', alert: 'MISSING', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
    }

    // 2. ELBOW ANGLE
    let shoulder = findKp('right_shoulder');
    let elbow = findKp('right_elbow');
    let wrist = findKp('right_wrist');
    
    if (!shoulder || !elbow || !wrist || ((shoulder.score || 0) < 0.3 && (elbow.score || 0) < 0.3)) {
        shoulder = findKp('left_shoulder');
        elbow = findKp('left_elbow');
        wrist = findKp('left_wrist');
    }

    if (shoulder && elbow && wrist && (shoulder.score || 0) > 0.2 && (elbow.score || 0) > 0.2 && (wrist.score || 0) > 0.2) {
        const angle = calculateAngle(shoulder, elbow, wrist);
        
        if (angle > 160) {
            alerts.push({ metric: 'Elbow', status: `${Math.round(angle)}°`, alert: 'CONTACT', color: 'text-[#39ff14]', borderColor: 'border-[#39ff14]/50', bg: 'bg-[#39ff14]/10', iconColor: 'text-[#39ff14]', shadowColor: 'rgba(57,255,20,1)', isGood: true });
        } else if (angle < 100) {
            alerts.push({ metric: 'Elbow', status: `${Math.round(angle)}°`, alert: 'LOADING', color: 'text-cyan-400', borderColor: 'border-cyan-400/50', bg: 'bg-cyan-400/10', iconColor: 'text-cyan-400', shadowColor: 'rgba(34,211,238,1)', isGood: false });
        } else {
            alerts.push({ metric: 'Elbow', status: `${Math.round(angle)}°`, alert: 'TRANSITION', color: 'text-yellow-500', borderColor: 'border-yellow-500/50', bg: 'bg-yellow-500/10', iconColor: 'text-yellow-500', shadowColor: 'rgba(234,179,8,1)', isGood: false });
        }
    } else {
        alerts.push({ metric: 'Elbow', status: 'MISSING', alert: 'MISSING', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
    }

    // 3. TORSO LEAN (POSTURE)
    let leftShoulder = findKp('left_shoulder');
    let rightShoulder = findKp('right_shoulder');
    let leftHip = findKp('left_hip');
    let rightHip = findKp('right_hip');

    if (leftShoulder && rightShoulder && leftHip && rightHip && 
        (leftShoulder.score || 0) > 0.2 && (rightShoulder.score || 0) > 0.2 && 
        (leftHip.score || 0) > 0.2 && (rightHip.score || 0) > 0.2) {
        
        const midShoulder = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };
        const midHip = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };

        // Calculate angle relative to vertical (y-axis)
        const dx = midShoulder.x - midHip.x;
        const dy = midHip.y - midShoulder.y; // Invert Y because canvas Y goes down
        const leanAngle = Math.abs(Math.atan2(dx, dy) * 180 / Math.PI);

        if (leanAngle < 10) {
            alerts.push({ metric: 'Posture', status: `${Math.round(leanAngle)}°`, alert: 'UPRIGHT', color: 'text-yellow-500', borderColor: 'border-yellow-500/50', bg: 'bg-yellow-500/10', iconColor: 'text-yellow-500', shadowColor: 'rgba(234,179,8,1)', isGood: false });
        } else if (leanAngle > 35) {
            alerts.push({ metric: 'Posture', status: `${Math.round(leanAngle)}°`, alert: 'BENT', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
        } else {
            alerts.push({ metric: 'Posture', status: `${Math.round(leanAngle)}°`, alert: 'ATHLETIC', color: 'text-[#39ff14]', borderColor: 'border-[#39ff14]/50', bg: 'bg-[#39ff14]/10', iconColor: 'text-[#39ff14]', shadowColor: 'rgba(57,255,20,1)', isGood: true });
        }
    } else {
        alerts.push({ metric: 'Posture', status: 'MISSING', alert: 'MISSING', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
    }

    // 4. SHOULDER TILT
    if (leftShoulder && rightShoulder && (leftShoulder.score || 0) > 0.2 && (rightShoulder.score || 0) > 0.2) {
        const dx = rightShoulder.x - leftShoulder.x;
        const dy = rightShoulder.y - leftShoulder.y;
        const tiltAngle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);

        if (tiltAngle > 20) {
            alerts.push({ metric: 'Shoulders', status: `${Math.round(tiltAngle)}°`, alert: 'LEVEL', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
        } else {
            alerts.push({ metric: 'Shoulders', status: `${Math.round(tiltAngle)}°`, alert: 'BALANCED', color: 'text-[#39ff14]', borderColor: 'border-[#39ff14]/50', bg: 'bg-[#39ff14]/10', iconColor: 'text-[#39ff14]', shadowColor: 'rgba(57,255,20,1)', isGood: true });
        }
    } else {
        alerts.push({ metric: 'Shoulders', status: 'MISSING', alert: 'MISSING', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
    }

    // 5. HEAD POSITION (Nose relative to shoulders)
    let nose = findKp('nose');
    if (nose && leftShoulder && rightShoulder && (nose.score || 0) > 0.2) {
        const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
        const headOffset = Math.abs(nose.x - midShoulderX);
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        
        if (shoulderWidth > 0 && (headOffset / shoulderWidth) > 0.5) {
            alerts.push({ metric: 'Head', status: 'OFF-CENTER', alert: 'FOCUS', color: 'text-yellow-500', borderColor: 'border-yellow-500/50', bg: 'bg-yellow-500/10', iconColor: 'text-yellow-500', shadowColor: 'rgba(234,179,8,1)', isGood: false });
        } else {
            alerts.push({ metric: 'Head', status: 'CENTERED', alert: 'FOCUSED', color: 'text-[#39ff14]', borderColor: 'border-[#39ff14]/50', bg: 'bg-[#39ff14]/10', iconColor: 'text-[#39ff14]', shadowColor: 'rgba(57,255,20,1)', isGood: true });
        }
    } else {
        alerts.push({ metric: 'Head', status: 'MISSING', alert: 'MISSING', color: 'text-red-500', borderColor: 'border-red-500/50', bg: 'bg-red-500/10', iconColor: 'text-red-500', shadowColor: 'rgba(239,68,68,1)', isGood: false });
    }

    if (alerts.length === 0) {
        alerts.push({ metric: 'Posture', status: 'ANALYZING', alert: 'WAIT', color: 'text-yellow-500', borderColor: 'border-yellow-500/50', bg: 'bg-yellow-500/10', iconColor: 'text-yellow-500', shadowColor: 'rgba(234,179,8,1)', isGood: false });
    }

    return alerts;
};

const PlayerCard = ({ capturedFrame, result, analysisInputs, poses = [] }: { capturedFrame: string, result: ClassificationResult, analysisInputs: any, poses?: poseDetection.Pose[] }) => {
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [cardStyle, setCardStyle] = useState<'standard' | 'schematic'>('standard');
    const [animationPhase, setAnimationPhase] = useState<number>(4); // 0: Scan, 1: Bones, 2: Joints, 3: Labels, 4: Complete
    const coachingAlerts = useMemo(() => getCoachingAlerts(poses?.[0]), [poses]);
    const activeAlerts = useMemo(() => {
        const alerts = coachingAlerts.filter(a => !a.isGood);
        // Sort to put Knees at the bottom
        return alerts.sort((a, b) => {
            if (a.metric === 'Knees') return 1;
            if (b.metric === 'Knees') return -1;
            return 0;
        });
    }, [coachingAlerts]);
    const goodStatuses = useMemo(() => coachingAlerts.filter(a => a.isGood), [coachingAlerts]);
    const [processedImage, setProcessedImage] = useState<string>(capturedFrame);
    const [edgeImage, setEdgeImage] = useState<string | null>(null);
    const [isGeneratingEdges, setIsGeneratingEdges] = useState(false);
    const poseCanvasRef = useRef<HTMLCanvasElement>(null);
    
    // Manage Animation Sequence
    React.useEffect(() => {
        if (cardStyle === 'schematic') {
            setAnimationPhase(0);
            const t1 = setTimeout(() => setAnimationPhase(1), 1000); // Edge Image
            const t2 = setTimeout(() => setAnimationPhase(2), 2000); // Bones/Mesh
            const t3 = setTimeout(() => setAnimationPhase(3), 3000); // Crosshairs
            const t4 = setTimeout(() => setAnimationPhase(4), 4000); // Biomechanical Scan Log (HUD)
            const t5 = setTimeout(() => setAnimationPhase(5), 5500); // Label 1 (Muscle Load)
            const t6 = setTimeout(() => setAnimationPhase(6), 7000); // Label 2 (Wrist Flex)
            const t7 = setTimeout(() => setAnimationPhase(7), 8500); // Label 3 (Heart Rate)
            const t8 = setTimeout(() => setAnimationPhase(8), 10000); // Label 4 (Shoulder Rot)
            const t9 = setTimeout(() => setAnimationPhase(9), 11500); // Label 5 (Foot Vel) & Coaching Alerts
            return () => {
                clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
                clearTimeout(t4); clearTimeout(t5); clearTimeout(t6);
                clearTimeout(t7); clearTimeout(t8); clearTimeout(t9);
            };
        } else {
            setAnimationPhase(9);
        }
    }, [cardStyle]);

    // Clear cache when captured frame changes
    React.useEffect(() => {
        setProcessedImage(capturedFrame);
        setEdgeImage(null);
    }, [capturedFrame]);

    // Generate Edge Map (Option 1: Pure Browser Edge Detection)
    React.useEffect(() => {
        if (cardStyle === 'schematic' && capturedFrame && !edgeImage && !isGeneratingEdges) {
            setIsGeneratingEdges(true);
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                // Use a timeout to allow UI to render before heavy processing
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; // Downscale for performance
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > MAX_WIDTH) {
                        height = Math.floor(height * (MAX_WIDTH / width));
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        setIsGeneratingEdges(false);
                        return;
                    }
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    const output = ctx.createImageData(width, height);
                    const outData = output.data;

                    const w = width;
                    for (let y = 1; y < height - 1; y++) {
                        for (let x = 1; x < width - 1; x++) {
                            const i00 = ((y - 1) * w + (x - 1)) * 4;
                            const i01 = ((y - 1) * w + x) * 4;
                            const i02 = ((y - 1) * w + (x + 1)) * 4;
                            const i10 = (y * w + (x - 1)) * 4;
                            const i12 = (y * w + (x + 1)) * 4;
                            const i20 = ((y + 1) * w + (x - 1)) * 4;
                            const i21 = ((y + 1) * w + x) * 4;
                            const i22 = ((y + 1) * w + (x + 1)) * 4;

                            // Use Green channel for grayscale approximation (fastest)
                            const g00 = data[i00+1]; const g01 = data[i01+1]; const g02 = data[i02+1];
                            const g10 = data[i10+1];                          const g12 = data[i12+1];
                            const g20 = data[i20+1]; const g21 = data[i21+1]; const g22 = data[i22+1];

                            const px = (g02 + 2*g12 + g22) - (g00 + 2*g10 + g20);
                            const py = (g20 + 2*g21 + g22) - (g00 + 2*g01 + g02);
                            const mag = Math.sqrt(px*px + py*py);

                            const outIdx = (y * w + x) * 4;
                            if (mag > 30) { // Edge threshold
                                const intensity = Math.min(255, mag * 1.5);
                                outData[outIdx] = 0; // R
                                outData[outIdx+1] = Math.floor(229 * (intensity/255)); // G
                                outData[outIdx+2] = 255; // B
                                outData[outIdx+3] = 255; // Alpha
                            } else {
                                outData[outIdx] = 2;   // R
                                outData[outIdx+1] = 11;  // G
                                outData[outIdx+2] = 20;  // B
                                outData[outIdx+3] = 255; // Alpha
                            }
                        }
                    }
                    ctx.putImageData(output, 0, 0);
                    setEdgeImage(canvas.toDataURL('image/jpeg', 0.8));
                    setIsGeneratingEdges(false);
                }, 50);
            };
            img.src = capturedFrame;
        }
    }, [cardStyle, capturedFrame, edgeImage, isGeneratingEdges]);

    // Draw Poses on Canvas
    React.useEffect(() => {
        if (!poseCanvasRef.current || poses.length === 0) return;

        const canvas = poseCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Load image to get original dimensions
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (cardStyle === 'schematic') {
                // Draw Technical Grid
                ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)'; // Cyan 400 with low opacity
                ctx.lineWidth = 1;
                const gridSize = Math.max(20, img.width / 40);
                
                for (let x = 0; x <= canvas.width; x += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                    ctx.stroke();
                }
                for (let y = 0; y <= canvas.height; y += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                }
            }

            if (cardStyle === 'schematic' && animationPhase <= 1) {
                // Phase 0 & 1: Just grid and thinking overlay
                return;
            }

            poses.forEach((pose, poseIdx) => {
                // Highlight the primary analyzed player with a glowing box
                if (poseIdx === 0 && cardStyle === 'schematic' && animationPhase >= 1) {
                    if (pose.box) {
                        const { xMin, yMin, width, height } = pose.box;
                        ctx.save();
                        ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)'; // Neon green
                        ctx.lineWidth = 2;
                        ctx.shadowColor = 'rgba(57, 255, 20, 0.8)';
                        ctx.shadowBlur = 15;
                        ctx.setLineDash([8, 4]);
                        ctx.strokeRect(xMin - 10, yMin - 10, width + 20, height + 20);

                        // Draw corner brackets for tech feel
                        ctx.setLineDash([]);
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = '#39ff14';
                        const bracketLen = Math.min(width, height) * 0.15;
                        const bxMin = xMin - 10;
                        const byMin = yMin - 10;
                        const bxMax = xMin + width + 10;
                        const byMax = yMin + height + 10;
                        
                        // Top Left
                        ctx.beginPath(); ctx.moveTo(bxMin, byMin + bracketLen); ctx.lineTo(bxMin, byMin); ctx.lineTo(bxMin + bracketLen, byMin); ctx.stroke();
                        // Top Right
                        ctx.beginPath(); ctx.moveTo(bxMax - bracketLen, byMin); ctx.lineTo(bxMax, byMin); ctx.lineTo(bxMax, byMin + bracketLen); ctx.stroke();
                        // Bottom Right
                        ctx.beginPath(); ctx.moveTo(bxMax, byMax - bracketLen); ctx.lineTo(bxMax, byMax); ctx.lineTo(bxMax - bracketLen, byMax); ctx.stroke();
                        // Bottom Left
                        ctx.beginPath(); ctx.moveTo(bxMin + bracketLen, byMax); ctx.lineTo(bxMin, byMax); ctx.lineTo(bxMin, byMax - bracketLen); ctx.stroke();

                        // Add "TARGET ACQUIRED" text
                        ctx.font = '10px "JetBrains Mono", monospace';
                        ctx.fillStyle = '#39ff14';
                        ctx.fillText('TARGET ACQUIRED', bxMin, byMin - 5);

                        ctx.restore();
                    }
                }

                // Draw Mesh (Schematic Only)
                if (cardStyle === 'schematic' && animationPhase >= 2) {
                    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
                    ctx.lineWidth = 0.5;
                    ctx.shadowBlur = 0;
                    
                    // Denser Mesh Triangles (High-End Diagnostic Look)
                    const meshTriangles = [
                        [0, 1, 2], [1, 2, 4], [0, 2, 3], [3, 4, 0], // Face/Head Detailed
                        [5, 6, 12], [5, 11, 12], [11, 12, 14], [11, 13, 14], // Torso/Hips
                        [5, 7, 6], [6, 8, 5], [7, 9, 8], [8, 10, 7], // Shoulders/Arms
                        [11, 13, 12], [12, 14, 11], [13, 15, 14], [14, 16, 13], // Hips/Legs
                        [5, 11, 13], [6, 12, 14], [5, 6, 0], [11, 12, 0] // Body-to-Head
                    ];

                    meshTriangles.forEach(indices => {
                        ctx.beginPath();
                        let valid = true;
                        const points: Point[] = [];
                        indices.forEach((idx, i) => {
                            const kp = pose.keypoints[idx];
                            if (kp.score > 0.2) {
                                points.push({ x: kp.x, y: kp.y });
                                if (i === 0) ctx.moveTo(kp.x, kp.y);
                                else ctx.lineTo(kp.x, kp.y);
                            } else {
                                valid = false;
                            }
                        });
                        if (valid) {
                            ctx.closePath();
                            ctx.stroke();
                            ctx.fillStyle = 'rgba(57, 255, 20, 0.08)'; // Neon green fill
                            ctx.fill();
                            
                            // Add "Internal Cross-Lines" for volume effect
                            if (points.length === 3) {
                                ctx.beginPath();
                                ctx.setLineDash([1, 2]);
                                ctx.strokeStyle = 'rgba(57, 255, 20, 0.15)'; // Neon green lines
                                const midX = (points[0].x + points[1].x + points[2].x) / 3;
                                const midY = (points[0].y + points[1].y + points[2].y) / 3;
                                points.forEach(p => {
                                    ctx.moveTo(p.x, p.y);
                                    ctx.lineTo(midX, midY);
                                });
                                ctx.stroke();
                                ctx.setLineDash([]);
                                ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
                            }
                        }
                    });
                }

                // Draw Skeleton (Phase 2+ for Schematic)
                if (animationPhase >= 2 && cardStyle === 'schematic') {
                    ctx.strokeStyle = '#39ff14'; // Neon Green
                    ctx.lineWidth = Math.max(4, img.width / 200);
                    ctx.lineCap = 'round';
                    ctx.shadowBlur = 25;
                    ctx.shadowColor = '#39ff14';

                    const connections = [
                        [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Upper
                        [5, 11], [6, 12], [11, 12],              // Torso
                        [11, 13], [13, 15], [12, 14], [14, 16]   // Lower
                    ];

                    const drawBone = (p1: any, p2: any, width: number) => {
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx);

                        ctx.save();
                        ctx.translate(p1.x, p1.y);
                        ctx.rotate(angle);

                        // Draw the bone shape
                        ctx.beginPath();
                        ctx.moveTo(0, -width * 0.3);
                        ctx.quadraticCurveTo(dist * 0.2, -width, dist * 0.5, -width * 0.8);
                        ctx.quadraticCurveTo(dist * 0.8, -width, dist, -width * 0.3);
                        ctx.lineTo(dist, width * 0.3);
                        ctx.quadraticCurveTo(dist * 0.8, width, dist * 0.5, width * 0.8);
                        ctx.quadraticCurveTo(dist * 0.2, width, 0, width * 0.3);
                        ctx.closePath();

                        ctx.fillStyle = 'rgba(57, 255, 20, 0.2)'; // Semi-transparent neon green fill
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(57, 255, 20, 0.8)'; // Solid neon green outline
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        // Draw joints (articulations)
                        ctx.beginPath();
                        ctx.arc(0, 0, width * 0.6, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
                        ctx.fill();
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(dist, 0, width * 0.6, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        ctx.restore();
                    };

                    connections.forEach(([i, j]) => {
                        const kp1 = pose.keypoints[i];
                        const kp2 = pose.keypoints[j];
                        if (kp1.score > 0.3 && kp2.score > 0.3) {
                            drawBone(kp1, kp2, Math.max(8, img.width / 120));
                        }
                    });
                }

                // Draw Keypoints (Phase 3+ for Schematic)
                if (animationPhase >= 3 && cardStyle === 'schematic') {
                    pose.keypoints.forEach((kp, idx) => {
                        if (kp.score > 0.3) {
                            // Technical Crosshair Marker
                            ctx.strokeStyle = '#39ff14'; // Neon Green
                            ctx.lineWidth = 2;
                            ctx.shadowBlur = 10;
                            const size = Math.max(8, img.width / 100);
                            
                            // Circle
                            ctx.beginPath();
                            ctx.arc(kp.x, kp.y, size / 2, 0, 2 * Math.PI);
                            ctx.stroke();
                            
                            // Cross
                            ctx.beginPath();
                            ctx.moveTo(kp.x - size, kp.y);
                            ctx.lineTo(kp.x + size, kp.y);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.moveTo(kp.x, kp.y - size);
                            ctx.lineTo(kp.x, kp.y + size);
                            ctx.stroke();

                            // Inner dot
                            ctx.fillStyle = 'white';
                            ctx.beginPath();
                            ctx.arc(kp.x, kp.y, 2, 0, 2 * Math.PI);
                            ctx.fill();

                            // Add leader lines (Staggered)
                            if (animationPhase >= 5) {
                                if (idx === 11) { // Left Hip
                                    drawLeaderLine(ctx, kp.x, kp.y, 'MUSCLE_LOAD', '?%', img.width, Math.PI / 3, 1);
                                }
                            }
                            if (animationPhase >= 6) {
                                if (idx === 8 || idx === 7) { // Elbows
                                    const isRight = idx === 8;
                                    const shoulder = poses[0].keypoints[isRight ? 6 : 5];
                                    const elbow = poses[0].keypoints[idx];
                                    const wrist = poses[0].keypoints[isRight ? 10 : 9];
                                    if (shoulder && elbow && wrist && (shoulder.score || 0) > 0.2 && (elbow.score || 0) > 0.2 && (wrist.score || 0) > 0.2) {
                                        const angle = calculateAngle(shoulder, elbow, wrist);
                                        const label = isRight ? 'R_ELBOW_ANG' : 'L_ELBOW_ANG';
                                        const value = Math.round(angle) + '°';
                                        drawLeaderLine(ctx, kp.x, kp.y, label, value, img.width, isRight ? -Math.PI / 8 : Math.PI * 0.85, isRight ? 1 : -1);
                                    }
                                }
                            }
                            if (animationPhase >= 7) {
                                if (idx === 0) { // Head
                                    // Point up-left to avoid elbow
                                    drawLeaderLine(ctx, kp.x, kp.y, 'HEART_RATE', '? BPM', img.width, Math.PI * 1.15, -1);
                                }
                            }
                            if (animationPhase >= 8) {
                                if (idx === 6 || idx === 5) { // Shoulders
                                    const isRightShldr = idx === 6;
                                    const hip = poses[0].keypoints[isRightShldr ? 12 : 11];
                                    const shoulder = poses[0].keypoints[idx];
                                    const elbow = poses[0].keypoints[isRightShldr ? 8 : 7];
                                    if (hip && shoulder && elbow && (hip.score || 0) > 0.2 && (shoulder.score || 0) > 0.2 && (elbow.score || 0) > 0.2) {
                                        const angle = calculateAngle(hip, shoulder, elbow);
                                        const label = isRightShldr ? 'R_SHLDR_ABD' : 'L_SHLDR_ABD';
                                        const value = Math.round(angle) + '°';
                                        // Point down-right or down-left to avoid title
                                        drawLeaderLine(ctx, kp.x, kp.y, label, value, img.width, isRightShldr ? Math.PI / 8 : Math.PI * 0.95, isRightShldr ? 1 : -1);
                                    }
                                }
                            }
                            if (animationPhase >= 9) {
                                if (idx === 14 || idx === 13) { // Knees
                                    const isRightKnee = idx === 14;
                                    const hip = poses[0].keypoints[isRightKnee ? 12 : 11];
                                    const knee = poses[0].keypoints[idx];
                                    const ankle = poses[0].keypoints[isRightKnee ? 16 : 15];
                                    if (hip && knee && ankle && (hip.score || 0) > 0.2 && (knee.score || 0) > 0.2 && (ankle.score || 0) > 0.2) {
                                        const angle = calculateAngle(hip, knee, ankle);
                                        const label = isRightKnee ? 'R_KNEE_ANG' : 'L_KNEE_ANG';
                                        const value = Math.round(angle) + '°';
                                        drawLeaderLine(ctx, kp.x, kp.y, label, value, img.width, isRightKnee ? Math.PI / 6 : Math.PI * 0.85, isRightKnee ? 1 : -1);
                                    }
                                }
                            }
                        }
                    });
                }

                // Draw Predictive Path (Schematic Only, Phase 9+)
                // Removed as per user request to avoid overlap with JSON Data Structure
            });
        };
        img.src = capturedFrame;
    }, [poses, capturedFrame, cardStyle, animationPhase]);

    const drawLeaderLine = (ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: string, imgWidth: number, angle: number = -Math.PI / 4, dir: number = 1) => {
        const lineLen = Math.max(80, imgWidth / 10);
        const endX = x + Math.cos(angle) * lineLen;
        const endY = y + Math.sin(angle) * lineLen;

        // Main Leader Line
        ctx.strokeStyle = '#39ff14'; // Neon Green
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Horizontal extension
        const fontSize = Math.max(16, imgWidth / 60); // Adjusted font size
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
        
        const labelWidth = ctx.measureText(label).width;
        const valWidth = ctx.measureText(value).width;
        const maxTextWidth = Math.max(labelWidth, valWidth);
        
        // Make extension length dynamic based on text width
        const extLen = (maxTextWidth + 24) * dir;
        
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX + extLen, endY);
        ctx.stroke();

        // Data Card Background (Holographic Look)
        ctx.fillStyle = 'rgba(2, 11, 20, 0.85)'; // Dark lab background
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)'; // Neon green border
        ctx.lineWidth = 1;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(57, 255, 20, 0.3)';
        
        const cardH = fontSize * 3; // Taller for 2 lines
        const rectX = dir === 1 ? endX : endX + extLen;
        const rectW = Math.abs(extLen);
        
        ctx.fillRect(rectX, endY - cardH, rectW, cardH);
        ctx.strokeRect(rectX, endY - cardH, rectW, cardH); // Add border for holographic feel
        ctx.shadowBlur = 0;

        // Label and Value (2 rows)
        ctx.fillStyle = '#39ff14'; // Neon Green
        ctx.fillText(label, rectX + 12, endY - cardH + fontSize * 1.2);
        
        ctx.fillStyle = 'white';
        ctx.fillText(value, rectX + 12, endY - cardH + fontSize * 2.4);
    };

    const handleDownloadCard = async () => {
        const cardElement = document.getElementById('shareable-card');
        if (!cardElement) return;

        try {
            // Ensure images are loaded before capturing
            const images = cardElement.getElementsByTagName('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
            }));

            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: null,
                logging: false,
                onclone: (clonedDoc) => {
                    // Ensure animations are at final state in clone
                    const clonedCard = clonedDoc.getElementById('shareable-card');
                    if (clonedCard) {
                        clonedCard.style.transform = 'none';
                    }
                }
            });

            const link = document.createElement('a');
            link.download = `pi1xia-card-${analysisInputs.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Failed to generate image:', error);
            alert('Failed to save the card. This can happen if the image source is restricted. Try taking a new evaluation or opening the app in a new tab.');
        }
    };

    return (
        <div className="mb-8 relative group perspective-1000">
            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-center mb-6 gap-4">
                {/* Style Toggle */}
                <div className="flex justify-center gap-2 bg-stone-200/50 p-1 rounded-xl backdrop-blur-sm border border-stone-300 w-fit mx-auto">
                    <button 
                        onClick={() => setCardStyle('standard')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            cardStyle === 'standard' 
                            ? 'bg-lime-400 text-green-900 shadow-lg' 
                            : 'text-stone-600 hover:bg-white/50 hover:text-stone-900'
                        }`}
                    >
                        Standard
                    </button>
                    <button 
                        onClick={() => setCardStyle('schematic')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            cardStyle === 'schematic' 
                            ? 'bg-cyan-400 text-black shadow-lg' 
                            : 'text-stone-600 hover:bg-white/50 hover:text-stone-900'
                        }`}
                    >
                        Schematic
                    </button>
                </div>

                {/* Orientation Toggle */}
                <div className="flex justify-center gap-2 bg-stone-200/50 p-1 rounded-xl backdrop-blur-sm border border-stone-300 w-fit mx-auto">
                    <button 
                        onClick={() => setOrientation('landscape')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            orientation === 'landscape' 
                            ? 'bg-green-900 text-white shadow-lg' 
                            : 'text-stone-600 hover:bg-white/50 hover:text-stone-900'
                        }`}
                    >
                        <i className="fas fa-image mr-2"></i> Landscape
                    </button>
                    <button 
                        onClick={() => setOrientation('portrait')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            orientation === 'portrait' 
                            ? 'bg-green-900 text-white shadow-lg' 
                            : 'text-stone-600 hover:bg-white/50 hover:text-stone-900'
                        }`}
                    >
                        <i className="fas fa-mobile-alt mr-2"></i> Portrait
                    </button>
                </div>
            </div>

            <div 
                id="shareable-card" 
                className={`relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 md:border-4 border-white transform transition-transform hover:scale-[1.01] mx-auto ${
                    orientation === 'landscape' ? 'aspect-[1.91/1]' : 'aspect-[9/16] max-w-sm'
                } ${cardStyle === 'schematic' ? 'bg-[#011617]' : ''}`}
            >
                {/* Scanning Laser Line (Phase 0) */}
                {cardStyle === 'schematic' && animationPhase < 4 && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan-y"></div>
                    </div>
                )}

                {/* Thinking Overlay (Phase 1) */}
                {cardStyle === 'schematic' && animationPhase === 1 && (
                    <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/20 backdrop-blur-[2px]">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
                                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping [animation-delay:0.2s]"></div>
                                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping [animation-delay:0.4s]"></div>
                            </div>
                            <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">
                                Collecting_Biometric_Data...
                            </p>
                        </div>
                    </div>
                )}

                {/* Technical Insight (Phase 4+) - REMOVED PER USER REQUEST */}
                
                {/* Background Image (Blurred for letterbox) */}
                <img 
                    src={cardStyle === 'schematic' && edgeImage ? edgeImage : processedImage} 
                    alt="Background" 
                    className={`absolute inset-0 w-full h-full object-cover blur-xl transition-all duration-1000 ${
                        cardStyle === 'schematic' && !edgeImage ? 'grayscale sepia hue-rotate-180 brightness-[0.2] contrast-125 opacity-40' : 
                        cardStyle === 'schematic' && animationPhase < 1 ? 'opacity-0' : 'opacity-40'
                    }`} 
                />
                
                {/* Foreground Image & Overlays */}
                <div className={`absolute inset-0 w-full h-full ${cardStyle === 'schematic' ? 'bg-[#020b14]' : ''}`}>
                    <img 
                        src={cardStyle === 'schematic' && edgeImage ? edgeImage : processedImage} 
                        alt="Action Shot" 
                        className={`absolute inset-0 w-full h-full object-contain transition-all duration-1000 ${
                            cardStyle === 'schematic' && !edgeImage ? 'grayscale sepia hue-rotate-180 brightness-[0.3] contrast-[1.2] opacity-40 mix-blend-screen' : 
                            cardStyle === 'schematic' && animationPhase < 1 ? 'opacity-0' : 'opacity-100 mix-blend-screen'
                        }`} 
                    />
                    {cardStyle === 'schematic' && (
                        <>
                            <div className="absolute inset-0 bg-[#021120]/60 mix-blend-multiply"></div>
                            {/* Blueprint Grid */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none"></div>
                        </>
                    )}
                    <canvas 
                        ref={poseCanvasRef} 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-40"
                    />
                </div>

                {/* Overlay Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-t transition-all duration-700 ${
                    cardStyle === 'schematic' 
                    ? 'from-black via-transparent to-black/40' 
                    : orientation === 'landscape' 
                        ? 'from-black/90 via-black/20 to-transparent' 
                        : 'from-black/90 via-black/10 to-transparent'
                }`}></div>
                
                {/* Scanning Animation for Schematic */}
                {cardStyle === 'schematic' && animationPhase < 5 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="w-full h-1 bg-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.8)] absolute top-0 animate-scan-y"></div>
                    </div>
                )}
                
                {/* Content */}
                <div className="absolute inset-0 p-3 md:p-6 flex flex-col justify-between">
                    {/* Top Row: Logo & Date */}
                    {cardStyle === 'schematic' ? (
                        <div className="relative pt-2 w-full px-4 h-12 md:h-16 z-20">
                            {/* Right Side: Pi1xia Performance Lab */}
                            <div className="absolute right-4 top-2 flex flex-col items-end text-right">
                                <h4 className="text-white font-black text-xs md:text-xl leading-none tracking-tight">Pi1xia</h4>
                                <p className="text-[#a3e635] text-[5px] md:text-[8px] font-bold uppercase tracking-widest mt-0.5">Performance Lab</p>
                            </div>
                            
                            {/* Center: Digital Performance Schematic */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-2 w-full text-center pointer-events-none flex flex-col items-center mt-6 md:mt-0">
                                <h3 className="text-[#00e5ff] font-mono text-[8px] md:text-sm uppercase tracking-[0.2em] opacity-80">
                                    Digital Performance
                                </h3>
                                <h2 className="text-[#00e5ff] font-black text-xs md:text-xl uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                                    Schematic
                                </h2>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-2">
                            </div>
                            <div className="text-right">
                                <h4 className="text-white font-black text-xs md:text-lg leading-none tracking-tight">Pi1xia</h4>
                                <p className="text-lime-400 text-[5px] md:text-[8px] font-bold uppercase tracking-widest">Performance Lab</p>
                            </div>
                        </div>
                    )}

                    {/* Bottom Row: Badge */}
                    <div className={`flex z-20 ${cardStyle === 'schematic' ? 'hidden' : orientation === 'landscape' ? 'items-end justify-between' : 'flex-col items-center text-center gap-4 mb-8'}`}>
                        {cardStyle === 'standard' && (
                            <div className="flex flex-col gap-1 mb-8 md:mb-12">
                                <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-2 py-1 md:px-3 md:py-1.5 self-start">
                                    <p className="text-white text-[6px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <i className="fas fa-microchip text-lime-400"></i>
                                        {result.insight}
                                    </p>
                                </div>
                                <p className="text-white/60 text-[6px] md:text-[8px] font-bold ml-2 md:ml-4 uppercase tracking-widest">
                                    {new Date().toLocaleDateString()} @ {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}
                        <div className={`flex items-end gap-2 md:gap-4 ${orientation === 'portrait' ? 'order-1' : ''}`}>
                            {/* The High-Tech Seal */}
                            <div className={`relative rounded-full flex items-center justify-center shrink-0 transition-all duration-1000 ${
                                cardStyle === 'schematic' 
                                ? 'bg-gradient-to-b from-[#84cc16]/50 to-[#4d7c0f]/50 shadow-[0_0_30px_rgba(132,204,22,0.3)] border border-[#a3e635]/40 scale-100 md:scale-110 -translate-y-2' 
                                : 'bg-gradient-to-br from-lime-400 to-green-600 shadow-[0_0_30px_rgba(132,204,22,0.6)] border md:border-4 border-white/20'
                            } ${
                                orientation === 'landscape' 
                                ? 'w-16 h-16 md:w-20 md:h-20' 
                                : 'w-20 h-20 md:w-24 md:h-24'
                            }`}>
                                <div className={`absolute inset-1 border border-dashed rounded-full ${cardStyle === 'schematic' ? 'border-white/30' : 'border-green-900/30'}`}></div>
                                <div className="absolute inset-2 border border-solid rounded-full border-white/10"></div>
                                <div className="text-center z-10">
                                    <span className={`block font-black uppercase tracking-widest mb-0.5 ${
                                        cardStyle === 'schematic' ? 'text-green-900/80' : 'text-green-900'
                                    } ${
                                        orientation === 'landscape' ? 'text-[5px] md:text-[8px]' : 'text-[7px] md:text-[9px]'
                                    }`}>DRIVING SHOT</span>
                                    <span className={`block font-black text-white leading-none tracking-tighter drop-shadow-md ${
                                        orientation === 'landscape' ? 'text-lg md:text-2xl' : 'text-2xl md:text-3xl'
                                    }`}>
                                        {activeAlerts.length >= 3 ? 'F' : result.preciseRating.toFixed(3)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Decorative HUD Elements (Schematic Only) */}
                {cardStyle === 'schematic' && animationPhase >= 4 && (
                    <>
                        {/* Biomechanical Scan Log Panel */}
                        <div className={`absolute top-16 right-4 md:top-20 md:right-8 z-30 pointer-events-none bg-[#020b14]/50 backdrop-blur-md border border-[#39ff14]/30 p-2 md:p-4 rounded-xl shadow-[0_0_20px_rgba(57,255,20,0.1)] ${orientation === 'portrait' ? 'w-[130px]' : 'w-[160px] md:w-[220px]'}`}>
                            <div className="text-white text-[6px] md:text-xs font-bold mb-1 md:mb-2 border-b border-[#39ff14]/30 pb-1 flex justify-between items-center">
                                <span>Biomechanical Scan Log</span>
                                <i className="fas fa-microchip text-[#39ff14]/70"></i>
                            </div>
                            <div className={`font-mono text-[#39ff14]/90 whitespace-pre-wrap leading-relaxed overflow-hidden relative ${orientation === 'portrait' ? 'text-[5px] h-[120px]' : 'text-[6px] md:text-[9px] h-[150px] md:h-[200px]'}`}>
                                <div className="absolute top-0 left-0 w-full animate-scrollUp">
{`{
  "Analysis_Event": {
    "ID": "SCAN_${Math.floor(Math.random() * 1000)}",
    "Player": "USR_77",
    "Keypoints": [
      {
        "name": "right_hip",
        "x": ${poses[0]?.keypoints.find(kp => kp.name === 'right_hip')?.x.toFixed(2) || '498.99'},
        "y": ${poses[0]?.keypoints.find(kp => kp.name === 'right_hip')?.y.toFixed(2) || '436.71'},
        "score": ${poses[0]?.keypoints.find(kp => kp.name === 'right_hip')?.score.toFixed(4) || '0.4191'}
      },
      {
        "name": "left_knee",
        "x": ${poses[0]?.keypoints.find(kp => kp.name === 'left_knee')?.x.toFixed(2) || '462.54'},
        "y": ${poses[0]?.keypoints.find(kp => kp.name === 'left_knee')?.y.toFixed(2) || '486.41'},
        "score": ${poses[0]?.keypoints.find(kp => kp.name === 'left_knee')?.score.toFixed(4) || '0.3783'}
      }
    ],
    "Metrics": {
      "Overall_Score": "${activeAlerts.length >= 3 ? 'F' : result.preciseRating.toFixed(4)}"
    }
  }
}
{
  "Analysis_Event": {
    "ID": "SCAN_${Math.floor(Math.random() * 1000)}",
    "Player": "USR_77",
    "Keypoints": [
      {
        "name": "right_hip",
        "x": ${poses[0]?.keypoints.find(kp => kp.name === 'right_hip')?.x.toFixed(2) || '498.99'},
        "y": ${poses[0]?.keypoints.find(kp => kp.name === 'right_hip')?.y.toFixed(2) || '436.71'},
        "score": ${poses[0]?.keypoints.find(kp => kp.name === 'right_hip')?.score.toFixed(4) || '0.4191'}
      },
      {
        "name": "left_knee",
        "x": ${poses[0]?.keypoints.find(kp => kp.name === 'left_knee')?.x.toFixed(2) || '462.54'},
        "y": ${poses[0]?.keypoints.find(kp => kp.name === 'left_knee')?.y.toFixed(2) || '486.41'},
        "score": ${poses[0]?.keypoints.find(kp => kp.name === 'left_knee')?.score.toFixed(4) || '0.3783'}
      }
    ],
    "Metrics": {
      "Overall_Score": "${activeAlerts.length >= 3 ? 'F' : result.preciseRating.toFixed(4)}"
    }
  }
}`}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {cardStyle === 'schematic' && animationPhase >= 9 && (
                    <>
                        {/* Coaching Alert Panel */}
                        <div className={`absolute ${orientation === 'portrait' ? 'bottom-20 left-2' : 'bottom-4 left-4 md:bottom-6 md:left-6'} z-30 flex flex-col gap-2 pointer-events-none`}>
                            {activeAlerts.map((alert, idx) => (
                                <div key={idx} className={`bg-[#020b14]/70 backdrop-blur-md border ${alert.borderColor} p-1.5 md:p-2 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.2)] w-[90px] md:w-[110px]`}>
                                    <div className={`flex items-center justify-between mb-1.5 border-b ${alert.borderColor} pb-0.5`}>
                                        <span className="text-red-500 text-[6px] md:text-[8px] font-bold">Coaching Alert</span>
                                        <i className={`fas fa-exclamation-triangle ${alert.iconColor} text-[6px] md:text-[8px] animate-pulse`}></i>
                                    </div>
                                    <div className={`relative h-8 md:h-10 ${alert.bg} rounded border ${alert.borderColor} mb-1.5 flex items-center justify-center overflow-hidden`}>
                                        <div className={`absolute w-4 h-4 border-2 border-red-500 rounded-full animate-ping opacity-50`}></div>
                                        <div className={`absolute w-1.5 h-1.5 bg-red-500 rounded-full`} style={{ boxShadow: `0 0 6px rgba(239,68,68,1)` }}></div>
                                        <div className={`absolute w-full h-[1px] ${alert.bg.replace('/10', '/50')} rotate-45`}></div>
                                        <div className={`absolute w-full h-[1px] ${alert.bg.replace('/10', '/50')} -rotate-45`}></div>
                                    </div>
                                    <div className="flex justify-between text-[5px] md:text-[7px] font-mono">
                                        <div className="text-center">
                                            <div className="text-white/60">{alert.metric}</div>
                                            <div className="text-white font-bold text-[6px] md:text-[8px]">{alert.status}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-white/60">Alert</div>
                                            <div className={`${alert.color} font-bold text-[6px] md:text-[8px]`}>{alert.alert}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Good Statuses / Validations */}
                            {goodStatuses.length > 0 && (
                                <div className="flex flex-col gap-1 mt-1">
                                    {goodStatuses.map((status, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            <i className="fas fa-check-circle text-[#39ff14] text-[6px] md:text-[8px]"></i>
                                            <span className="text-[#39ff14] font-mono text-[6px] md:text-[8px] uppercase tracking-wider">{status.metric}: {status.alert}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Muscle Data Box (Moved to bottom right) */}
                        <div className={`absolute ${orientation === 'portrait' ? 'top-16 left-2 w-[130px] flex flex-col items-start gap-1' : 'bottom-4 right-4 md:bottom-6 md:right-8 w-[160px] md:w-[220px] flex justify-between items-center'} z-40 pointer-events-none bg-[#020b14]/80 backdrop-blur-sm border border-[#39ff14]/40 p-2 md:p-3 rounded-lg shadow-[0_0_15px_rgba(57,255,20,0.15)]`}>
                            <div className="flex items-center gap-2">
                                <i className="fas fa-heart text-red-500 text-sm md:text-base animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"></i>
                                <span className="text-white/90 text-[10px] md:text-sm font-mono font-bold tracking-wider">? bpm</span>
                            </div>
                            <div className={`${orientation === 'portrait' ? 'text-left pl-6' : 'text-right'}`}>
                                <div className="text-[6px] md:text-[10px] font-mono text-[#39ff14]/90 mb-0.5">?% quadriceps</div>
                                <div className="text-[6px] md:text-[10px] font-mono text-[#39ff14]/90">?% hamstring</div>
                            </div>
                        </div>
                    </>
                )}

                {/* Technical HUD Corners (Schematic Only) */}
                {cardStyle === 'schematic' && (
                    <div className="absolute inset-0 z-40 pointer-events-none">
                        {/* Top Left */}
                        <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-[#39ff14]/30"></div>
                        {/* Top Right */}
                        <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-[#39ff14]/30"></div>
                        {/* Bottom Left */}
                        <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-[#39ff14]/30"></div>
                        {/* Bottom Right */}
                        <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-[#39ff14]/30"></div>
                        
                        {/* Data Stream */}
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-1 h-8 bg-[#39ff14]/10 rounded-full overflow-hidden">
                                    <motion.div 
                                        animate={{ y: [-32, 32] }}
                                        transition={{ duration: 1 + i * 0.5, repeat: Infinity, ease: "linear" }}
                                        className="w-full h-4 bg-[#39ff14]/40"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* URL Watermark & QR Code */}
                <div className={`absolute bottom-2 md:bottom-3 left-0 right-0 flex justify-center items-center gap-3 ${
                    orientation === 'portrait' ? 'bottom-4' : ''
                } z-20`}>
                    {cardStyle === 'schematic' && (
                        <div className={`relative rounded-full flex items-center justify-center shrink-0 transition-all duration-1000 bg-gradient-to-b from-[#84cc16]/50 to-[#4d7c0f]/50 shadow-[0_0_30px_rgba(132,204,22,0.3)] border border-[#a3e635]/40 ${
                            orientation === 'landscape' 
                            ? 'w-12 h-12 md:w-16 md:h-16' 
                            : 'w-10 h-10 md:w-14 md:h-14'
                        }`}>
                            <div className="absolute inset-1 border border-dashed rounded-full border-white/30"></div>
                            <div className="absolute inset-2 border border-solid rounded-full border-white/10"></div>
                            <div className="text-center z-10">
                                <span className={`block font-black uppercase tracking-widest mb-0.5 text-green-900/80 ${
                                    orientation === 'landscape' ? 'text-[4px] md:text-[6px]' : 'text-[3px] md:text-[5px]'
                                }`}>DRIVING SHOT</span>
                                <span className={`block font-black text-white leading-none tracking-tighter drop-shadow-md ${
                                    orientation === 'landscape' ? 'text-sm md:text-xl' : 'text-xs md:text-lg'
                                }`}>
                                    {activeAlerts.length >= 3 ? 'F' : result.preciseRating.toFixed(3)}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className={`${cardStyle === 'schematic' ? 'bg-cyan-950/80 border-cyan-400/30' : 'bg-white'} p-0.5 md:p-1 rounded shadow-lg border`}>
                        <QRCodeSVG 
                            value={`https://ascepd.com/player/${analysisInputs.name.replace(/\s+/g, '-').toLowerCase()}`} 
                            size={24} 
                            level="L"
                            className={`w-5 h-5 md:w-8 md:h-8 ${cardStyle === 'schematic' ? 'invert brightness-200' : ''}`}
                        />
                    </div>
                    <div className={`text-[12px] md:text-base font-black uppercase tracking-[0.2em] drop-shadow-md ${cardStyle === 'schematic' ? 'text-cyan-400' : 'text-white'}`}>
                        ascepd.com
                    </div>
                </div>
            </div>
            
            <div className="mt-4 flex justify-center">
                <button 
                    onClick={handleDownloadCard}
                    className="bg-green-900 hover:bg-green-800 text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 uppercase tracking-widest"
                >
                    <i className="fas fa-download"></i> Save Player Card
                </button>
            </div>
        </div>
    );
};

const PlayerClassification: React.FC<Props> = ({ profile, onUpdate, onRequireAuth, onUpgrade, isAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [driveResult, setDriveResult] = useState<DriveAnalysisResult | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80
  });
  const [completedCrop, setCompletedCrop] = useState<any>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [poses, setPoses] = useState<poseDetection.Pose[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nameError, setNameError] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(null);
  
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<number>();

  // Load last assessment from profile history
  useEffect(() => {
    if (profile.loggedMatches && profile.loggedMatches.length > 0) {
      const lastAssessment = profile.loggedMatches.find(m => m.type === 'Assessment' && m.assessmentData);
      if (lastAssessment && lastAssessment.assessmentData) {
        setResult(lastAssessment.assessmentData);
      }
    }
  }, [profile.loggedMatches]);

  // Added name to state as requested
  const [analysisInputs, setAnalysisInputs] = useState({
    name: profile.name === 'Guest' ? '' : (profile.name || ''),
    videoDesc: 'Match highlights showing standard dinks and some overhead smashes.',
    coachComments: profile.coachComments || '',
    yearsPlayed: profile.yearsPlayed || 0
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleRating = (feature: string, rating: number) => {
    const updatedResponses = {
      ...(profile.surveyResponses || {}),
      [feature]: rating
    };
    onUpdate({
      ...profile,
      surveyResponses: updatedResponses
    });
  };

  // Detailed Rating Tooltip Content
  const ratingTooltipContent = (
    <div className="space-y-2">
      <p className="font-bold text-lime-400 uppercase tracking-wider mb-1 text-[10px]">Skill Group Reference</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[9px]">
        <span className="font-bold text-white whitespace-nowrap">Group 1 (1.0 - 2.5):</span> 
        <span className="text-white/80">Novice. Learning court positioning and basic strokes.</span>
        
        <span className="font-bold text-white whitespace-nowrap">Group 2 (3.0 - 3.5):</span> 
        <span className="text-white/80">Intermediate. Consistent serves/returns, developing 3rd shot drop.</span>
        
        <span className="font-bold text-white whitespace-nowrap">Group 3 (4.0+):</span> 
        <span className="text-white/80">Advanced. High consistency, strategy, spin, and power control.</span>
      </div>
      <div className="pt-2 border-t border-white/10 mt-1">
        <a 
          href="https://pickleballcanada.org/wp-content/uploads/2024/01/Ratings-Chart-EN.pdf" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-lime-400 hover:text-lime-300 underline font-bold flex items-center gap-1 text-[9px]"
        >
          <i className="fas fa-external-link-alt"></i> View Official Ratings Chart (PDF)
        </a>
      </div>
    </div>
  );

  // --- LIMIT LOGIC ---
  const remainingScans = useMemo(() => {
    if (isAdmin) return 9999; // Unlimited for Director/Admin
    if (!profile.isRegistered) return 0;
    
    // Check if month has changed (simple check)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastEvalMonth = profile.lastEvaluationDate ? profile.lastEvaluationDate.slice(0, 7) : null;
    
    const usedThisMonth = (currentMonth === lastEvalMonth) ? (profile.evaluationsThisMonth || 0) : 0;
    const totalUsed = profile.totalEvaluations || 0;

    const tier = profile.membershipTier ? profile.membershipTier.toLowerCase() : 'free';

    if (tier === 'free') {
        return Math.max(0, 1 - totalUsed);
    } else if (tier === 'pro' || tier === 'the banger') {
        return Math.max(0, 2 - usedThisMonth);
    } else if (tier === 'elite' || tier === 'kitchen king') {
        return Math.max(0, 4 - usedThisMonth);
    }
    return 0; 
  }, [profile, isAdmin]);

  const limitReached = remainingScans <= 0;

  // --- MODEL SELECTION LOGIC ---
  // Elite and Admin get Pro (Deep Reasoning), others get Flash (Fast)
  const isProModel = (profile.membershipTier === 'Elite' || profile.membershipTier === 'Kitchen King') || isAdmin;
  const activeModelName = isProModel ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  const displayModelName = isProModel ? 'Gemini Pro' : 'Gemini Flash';

  const runPoseDetection = async (base64: string) => {
    try {
      const img = await base64ToImage(base64);
      const detectedPoses = await detectPose(img);
      setPoses(detectedPoses);
      console.log('Poses detected:', detectedPoses);
    } catch (err) {
      console.error('Pose detection failed:', err);
    }
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    
    setIsCapturing(true);
    const video = videoRef.current;
    
    // Create a canvas to draw the current video frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // High quality JPEG
      setCapturedFrame(dataUrl);
      
      // Run Pose Detection in the background
      runPoseDetection(dataUrl);
    }
    
    setIsCapturing(false);
  };

  const handleRetakeFrame = () => {
    setCapturedFrame(null);
    setPoses([]);
  };

  const getCroppedImg = (image: HTMLImageElement, crop: any): string => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Use natural resolution for the cropped image to maintain quality
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return '';
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const applyCrop = async () => {
    if (imgRef.current && completedCrop?.width && completedCrop?.height) {
      const croppedImageUrl = getCroppedImg(imgRef.current, completedCrop);
      setCapturedFrame(croppedImageUrl);
      setShowCropModal(false);
      
      // Re-run pose detection on the cropped image
      try {
        const img = await base64ToImage(croppedImageUrl);
        const newPoses = await detectPose(img);
        setPoses(newPoses);
      } catch (err) {
        console.error("Failed to detect pose on cropped image", err);
      }
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. File Size Check (e.g., 200MB limit to prevent browser crash)
    if (file.size > 200 * 1024 * 1024) {
        alert("File too large. Please upload a video smaller than 200MB.");
        if (videoUploadRef.current) videoUploadRef.current.value = '';
        return;
    }

    // 2. Video Duration Check
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > 180.5) { // 3 minutes + buffer
            alert(`Video exceeds limit (${Math.round(duration)}s). Please trim your video to under 3 minutes.`);
            if (videoUploadRef.current) videoUploadRef.current.value = '';
            setVideoFile(null);
            setVideoPreviewUrl(null);
        } else {
            // Success
            setVideoFile(file);
            setVideoPreviewUrl(URL.createObjectURL(file));
        }
    };
    
    video.onerror = function() {
        alert("Could not load video metadata. Please try a different file format.");
    };

    video.src = URL.createObjectURL(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleVideoDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setAnalysisInputs({...analysisInputs, videoDesc: value});

    // Detect word under cursor
    const textBeforeCursor = value.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/[\s,]+/);
    const currentWord = words[words.length - 1].toLowerCase();

    if (currentWord.length >= 2) {
      const matches = PICKLEBALL_TERMS.filter(term => 
        term.startsWith(currentWord) && term !== currentWord
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (term: string) => {
    if (!textAreaRef.current) return;
    const value = analysisInputs.videoDesc;
    const cursorPosition = textAreaRef.current.selectionStart;
    
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    
    const words = textBeforeCursor.split(/([\s,]+)/);
    // Replace the last non-separator word
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].trim().length > 0) {
        words[i] = term;
        break;
      }
    }
    
    const newValue = words.join('') + ' ' + textAfterCursor;
    setAnalysisInputs({...analysisInputs, videoDesc: newValue});
    setSuggestions([]);
    
    // Maintain focus
    setTimeout(() => {
      textAreaRef.current?.focus();
      const newPos = words.join('').length + 1;
      textAreaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleClassify = async () => {
    if (!isAdmin && onRequireAuth && onRequireAuth()) return;

    if (limitReached && !isAdmin) {
        alert("Evaluation limit reached for your current plan. Please upgrade to continue.");
        return;
    }

    if (!analysisInputs.name.trim()) {
      setNameError(true);
      alert("Please enter a player name before running the assessment!");
      return;
    }
    
    if (!videoFile && !capturedFrame) {
      alert("Please capture an action shot or upload a video first!");
      return;
    }

    setNameError(false);
    setLoading(true);
    setSelectedPlanIndex(null); // Reset selection
    try {
      let mediaData = undefined;
      if (videoFile) {
        const base64 = await fileToBase64(videoFile);
        mediaData = { data: base64, mimeType: videoFile.type };
      }

      const [res, driveRes] = await Promise.all([
        classifyPlayer(
          analysisInputs.videoDesc, 
          analysisInputs.coachComments || 'No coach feedback provided.', 
          profile.selfEval,
          profile.duprRank,
          analysisInputs.yearsPlayed,
          mediaData,
          activeModelName
        ),
        mediaData ? analyzeDrive(mediaData, activeModelName) : Promise.resolve(null)
      ]);
      
      setResult(res);
      setDriveResult(driveRes);
      
      const isPaidMember = profile.membershipTier === 'Pro' || profile.membershipTier === 'Elite';
      
      const today = new Date().toISOString();
      const currentMonth = today.slice(0, 7);
      const lastEvalMonth = profile.lastEvaluationDate ? profile.lastEvaluationDate.slice(0, 7) : null;
      
      const newEvaluationsThisMonth = (currentMonth === lastEvalMonth) ? (profile.evaluationsThisMonth || 0) + 1 : 1;
      const newTotalEvaluations = (profile.totalEvaluations || 0) + 1;

      // Update profile with the new name
      const updatedProfile: PlayerProfile = { 
        ...profile, 
        name: analysisInputs.name, 
        skillGroup: res.groupId, 
        yearsPlayed: analysisInputs.yearsPlayed,
        coachComments: analysisInputs.coachComments,
        lastEvaluationDate: today,
        evaluationsThisMonth: newEvaluationsThisMonth,
        totalEvaluations: newTotalEvaluations
      };

      // If Paid Member, Record to History
      if (isPaidMember) {
        const newLog: MatchHistory = {
          date: today.split('T')[0],
          duration: 'AI Eval',
          location: 'Virtual Lab',
          coachNotes: res.summary,
          type: 'Assessment',
          assessmentData: res,
          opponents: [],
          games: []
        };
        updatedProfile.loggedMatches = [newLog, ...(profile.loggedMatches || [])];
        
        // Update stats to reflect AI usage
        if (updatedProfile.weeklyStats) {
          updatedProfile.weeklyStats = {
            ...updatedProfile.weeklyStats,
            usedAIAnalysis: true,
            aiShownImprovement: true
          };
        }
      }

      onUpdate(updatedProfile);

    } catch (error) {
      console.error(error);
      alert("Classification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: string, index: number) => {
    if (!isAdmin && onRequireAuth && onRequireAuth()) return;

    setSelectedPlanIndex(index);
    
    // Save selected plan to profile stats
    const updatedProfile = { ...profile };
    if (!updatedProfile.weeklyStats) {
      updatedProfile.weeklyStats = {
        matchesPlayed: 0,
        matchesTarget: 3,
        latenessMinutes: [],
        missedMatches: 0,
        invitesSent: 0,
        friendInvites: [],
        warmupsCount: 0,
        usedAIAnalysis: true,
        aiShownImprovement: false,
        activeImprovementPlan: plan
      };
    } else {
      updatedProfile.weeklyStats = {
        ...updatedProfile.weeklyStats,
        activeImprovementPlan: plan
      };
    }
    
    onUpdate(updatedProfile);
  };

  const handleStartAuth = () => {
    if (onRequireAuth) onRequireAuth();
  };

  const handlePrintPDF = () => {
    window.print();
    alert("Report sent to print queue! (Select 'Save as PDF' in the destination options)");
  };

  const handleDownloadCard = async () => {
    const cardElement = document.getElementById('shareable-card');
    if (!cardElement) return;

    try {
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        scale: 2, // Higher resolution
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = `Pi1xia-Card-${analysisInputs.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Failed to generate card image", error);
      alert("Could not generate image. Please try taking a screenshot instead.");
    }
  };

  return (
    <div className="relative rounded-[2.5rem] border border-stone-100 shadow-sm animate-in fade-in duration-500 z-0">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 scale-105 blur-[2px] opacity-20 rounded-[2.5rem] overflow-hidden"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1626225010660-327c53648938?q=80&w=2070&auto=format&fit=crop")' }}
      ></div>
      
      <div className="relative z-10 bg-white/70 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-green-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-wand-magic-sparkles text-green-900 text-lg"></i>
              </div>
              Skill Evaluation
            </h2>
            <p className="text-stone-500 font-bold text-xs uppercase tracking-widest mt-1">Instant, on-device analysis. No waiting in server queues.</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1.5 rounded-full border-2 border-white shadow-md whitespace-nowrap flex items-center gap-1 relative group cursor-help">
               <i className="fas fa-bolt"></i> {isAdmin ? '∞' : (profile.sparksBalance || 0)} Sparks
               <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-32 p-2 bg-black/90 text-white text-[9px] text-center rounded-lg shadow-xl z-50 whitespace-normal">
                 AI Scan: 50 ⚡
               </div>
            </div>
            {profile.isRegistered && (
              <div className="flex flex-col items-end">
                 <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isAdmin ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : limitReached ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-white text-stone-500 border-stone-200'}`}>
                   {isAdmin ? 'Director Access (Unlimited)' : profile.membershipTier === 'Free' ? 'Lifetime Scan' : 'Monthly Scans'}: {isAdmin ? '∞' : remainingScans} Left
                 </span>
                 {(limitReached || profile.membershipTier === 'Free') && onUpgrade && !isAdmin && (
                   <button 
                     onClick={onUpgrade} 
                     className="mt-2 text-[9px] font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1 transition-all hover:scale-105"
                   >
                     <i className="fas fa-arrow-up"></i> Upgrade Plan
                   </button>
                 )}
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-8">
          <div className="bg-green-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative">
            <div className="relative z-10">
              <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-lime-400 text-green-900 rounded-lg flex items-center justify-center">
                  <i className="fas fa-video text-sm"></i>
                </div>
                <div className="flex items-center gap-2">
                  Video Analysis
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ml-2 border ${isProModel ? 'bg-yellow-400 text-green-900 border-yellow-300' : 'bg-green-800 text-lime-300 border-lime-700'}`}>
                    Powered by {displayModelName}
                  </span>
                  <Tooltip content={
                    isProModel 
                      ? "Elite Perk: You are using Gemini Pro (available on the $19.99 plan) for the deepest biomechanical analysis." 
                      : "Standard Analysis: Using Gemini Flash. Upgrade to Elite ($19.99) to unlock Gemini Pro for deep reasoning and detailed critique."
                  } />
                </div>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div 
                  className={`aspect-video bg-green-800/40 rounded-3xl border-2 border-dashed border-lime-400/30 flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-inner ${(limitReached && !isAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {videoPreviewUrl ? (
                    <div className="relative w-full h-full group z-0">
                      <video 
                        ref={videoRef}
                        src={videoPreviewUrl} 
                        className="w-full h-full object-contain bg-black relative z-10" 
                        controls 
                        crossOrigin="anonymous"
                      />
                      
                      {/* Capture Controls Overlay */}
                      {!capturedFrame && (
                        <div className="absolute top-4 right-4 z-20">
                          <button 
                            onClick={handleCaptureFrame}
                            className="bg-white/90 hover:bg-white text-green-900 px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-lg font-black uppercase text-[9px] md:text-[10px] tracking-widest flex items-center gap-2 backdrop-blur-sm transition-all hover:scale-105 opacity-80 hover:opacity-100"
                            title="Pause video at the perfect moment and click here!"
                          >
                            <i className="fas fa-camera text-base md:text-lg"></i>
                            <span className="hidden xs:inline">Capture Action Shot</span>
                            <span className="xs:hidden">Capture</span>
                          </button>
                        </div>
                      )}

                      {/* Captured Frame Preview Overlay */}
                      {capturedFrame && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in duration-300">
                          <div className="relative max-w-[90%] max-h-[90%] bg-white p-2 rounded-2xl shadow-2xl border-4 border-lime-400">
                             <img src={capturedFrame} alt="Action Shot" className="rounded-xl max-h-[60vh] object-contain" />
                             <div className="absolute -top-3 -right-3 flex gap-2">
                               <button 
                                 onClick={() => setShowCropModal(true)}
                                 className="bg-blue-500 hover:bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                 title="Crop Image"
                               >
                                 <i className="fas fa-crop-alt"></i>
                               </button>
                               <button 
                                 onClick={handleRetakeFrame}
                                 className="bg-rose-500 hover:bg-rose-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                 title="Discard and Retake"
                               >
                                 <i className="fas fa-times"></i>
                               </button>
                             </div>
                             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-900/90 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md whitespace-nowrap border border-lime-400/30">
                               <i className="fas fa-check-circle text-lime-400 mr-2"></i>
                               Action Shot Ready
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => (!limitReached || isAdmin) && videoUploadRef.current?.click()}
                      className={`w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-green-800/60 transition-colors`}
                    >
                      <i className={`fas ${(limitReached && !isAdmin) ? 'fa-lock' : 'fa-cloud-upload-alt'} text-2xl text-lime-400 mb-4`}></i>
                      <p className="text-xs font-black text-lime-200 uppercase tracking-widest">{(limitReached && !isAdmin) ? "Limit Reached" : "Upload Match Video"}</p>
                      {(!limitReached || isAdmin) && (
                        <div className="mt-4 flex flex-col items-center gap-3">
                           <div className="flex flex-wrap justify-center items-center gap-2">
                             <div className="flex items-center gap-1 group relative">
                               <span className="text-[9px] font-bold text-lime-400/80 uppercase tracking-widest bg-black/20 px-2 py-1 rounded cursor-help">
                                 Max Duration: 3 Mins
                               </span>
                               {/* Tooltip for the ruler */}
                               <div className="absolute top-full mt-2 hidden group-hover:block w-48 p-2 bg-black/90 text-white text-[9px] rounded-lg text-center z-50 border border-white/20">
                                  Strict Rule: AI analysis is limited to video clips under 3 minutes to ensure high-quality processing.
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-1 group relative">
                               <span className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-widest bg-black/20 px-2 py-1 rounded cursor-help flex items-center gap-1">
                                 <i className="fas fa-info-circle"></i> Best Results
                               </span>
                               <div className="absolute top-full mt-2 hidden group-hover:block w-64 p-3 bg-black/95 text-white text-[9px] rounded-lg text-left z-50 border border-cyan-400/30 shadow-xl">
                                  <ul className="list-disc pl-3 space-y-1.5 text-cyan-100/90 leading-relaxed">
                                    <li>Shoot video <strong>parallel to the baseline</strong> (side view) or directly behind the player for accurate angles.</li>
                                    <li>The AI analyzes the <strong>largest, most centered</strong> player in the frame.</li>
                                    <li>AI can make mistakes! If your scan looks off, email us and we can rescan it for you.</li>
                                  </ul>
                               </div>
                             </div>
                           </div>
                           <span className="text-[7px] font-bold text-lime-400/50 uppercase tracking-widest">
                             Larger files will be rejected
                           </span>
                        </div>
                      )}
                    </div>
                  )}
                  <input type="file" ref={videoUploadRef} className="hidden" accept="video/*" onChange={handleVideoUpload} disabled={limitReached && !isAdmin} />
                  
                  {loading && (
                    <div className="absolute inset-0 bg-green-900/70 backdrop-blur-md flex flex-col items-center justify-center z-30">
                      <div className="w-3/4 h-1.5 bg-lime-400/10 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-lime-400 animate-loading-slide"></div>
                      </div>
                      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-lime-400 animate-pulse">Scanning Visuals...</p>
                    </div>
                  )}
                </div>

                <div className={`space-y-6 ${(limitReached && !isAdmin) ? 'opacity-50 pointer-events-none' : ''}`}>
                  {/* Name Input Field */}
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${nameError ? 'text-rose-400' : 'text-lime-400'}`}>
                      Player Name <span className="text-rose-400">*</span>
                      <Tooltip content="This is the name that will be displayed on your profile and used in matchmaking." />
                    </label>
                    <input 
                      type="text"
                      value={analysisInputs.name}
                      onChange={(e) => {
                        setAnalysisInputs({...analysisInputs, name: e.target.value});
                        if (e.target.value.trim()) setNameError(false);
                      }}
                      placeholder="Who is being evaluated?"
                      className={`w-full p-4 rounded-2xl bg-transparent border focus:ring-4 outline-none transition-all text-sm text-white placeholder-white/20 shadow-inner ${nameError ? 'border-rose-500 ring-rose-500/20' : 'border-white/20 focus:ring-lime-400/20'}`}
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-black text-lime-400 uppercase tracking-widest mb-2 ml-1">
                      Video Description
                      <Tooltip content="Briefly explain what happens in the video. Type common terms like 'dink', 'smash', or 'third shot' for smart suggestions." />
                    </label>
                    <textarea 
                      ref={textAreaRef}
                      value={analysisInputs.videoDesc}
                      onChange={handleVideoDescChange}
                      className="w-full p-4 rounded-2xl bg-transparent border border-white/20 focus:ring-4 focus:ring-lime-400/20 outline-none transition-all text-sm h-24 text-white placeholder-white/20 shadow-inner scrollbar-hide"
                      placeholder="Describe the play or highlights in the video..."
                    />
                    
                    {/* Autocomplete Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 z-50 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-lime-400/30 shadow-2xl overflow-hidden p-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {suggestions.map((term, i) => (
                            <button
                              key={i}
                              onClick={() => applySuggestion(term)}
                              className="bg-green-900 hover:bg-lime-500 hover:text-green-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest transition-all flex items-center gap-2 group"
                            >
                              <i className="fas fa-plus text-[8px] opacity-40 group-hover:opacity-100"></i>
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-lime-400 uppercase tracking-widest mb-2 ml-1">
                      Coach Comments
                      <Tooltip content="Optional: Add feedback from a pro or instructor. The AI combines professional insights with video data for a highly accurate rating." />
                    </label>
                    <textarea 
                      value={analysisInputs.coachComments}
                      onChange={(e) => setAnalysisInputs({...analysisInputs, coachComments: e.target.value})}
                      className="w-full p-4 rounded-2xl bg-transparent border border-white/20 focus:ring-4 focus:ring-lime-400/20 outline-none transition-all text-sm h-24 text-white placeholder-white/20 shadow-inner"
                      placeholder="Enter feedback from a coach or instructor..."
                    />
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-info-circle text-lime-400"></i>
                      <p className="text-[10px] font-bold text-white/60 leading-tight">Baseline Profile Data:</p>
                    </div>
                    <div className="pl-7 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[9px] text-lime-100/60 font-bold uppercase">• DUPR: {profile.duprRank > 0 ? profile.duprRank.toFixed(2) : 'Unrated'}</p>
                        <Tooltip content="Dynamic Universal Pickleball Rating - A global rating system for pickleball players." />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[9px] text-lime-100/60 font-bold uppercase">• Self-Eval: {profile.selfEval.toFixed(1)}</p>
                        <Tooltip content={ratingTooltipContent} />
                      </div>
                      {profile.membershipTier !== 'Free' && (
                         <div className="flex items-center gap-1.5 mt-1">
                           <i className="fas fa-check-circle text-lime-400 text-[10px]"></i>
                           <p className="text-[9px] text-lime-400 font-bold uppercase">Result will save to Stats History</p>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={(profile.isRegistered || isAdmin) ? handleClassify : handleStartAuth} 
              disabled={loading || (profile.isRegistered && limitReached && !isAdmin)} 
              className={`flex-1 font-black py-6 rounded-3xl transition-all shadow-xl disabled:opacity-50 uppercase tracking-[0.2em] text-base flex items-center justify-center gap-3 ${nameError ? 'bg-rose-500 text-white animate-shake' : (limitReached && !isAdmin) ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-green-900 shadow-yellow-100/50'}`}
            >
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className={`fas ${(limitReached && !isAdmin) ? 'fa-lock' : (profile.isRegistered || isAdmin) ? 'fa-magic' : 'fa-lock'}`}></i>}
              {loading ? 'Evaluating...' : (limitReached && !isAdmin) ? 'Scan Limit Reached' : ((profile.isRegistered || isAdmin) ? 'Run AI Skill Assessment' : 'Sign In to Run AI Assessment')}
            </button>
          </div>

          {result && (
            <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Core Rating Section */}
                <div className="bg-gradient-to-br from-lime-50 to-white p-8 rounded-[2.5rem] border border-lime-200 shadow-xl flex flex-col justify-center items-center text-center relative min-h-[300px]">
                  <div className="relative group/id-badge mb-6">
                    <div className="bg-green-600 text-white w-24 h-24 flex flex-col items-center justify-center rounded-[2rem] shadow-xl ring-8 ring-white cursor-help">
                      <span className="text-xs font-black uppercase opacity-60">GRP</span>
                      <span className="text-4xl font-black leading-none">{result.groupId.split(' ')[1]}</span>
                    </div>
                    <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3">
                       <i className="fas fa-circle-info text-lime-500 bg-white rounded-full text-lg"></i>
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/id-badge:block w-72 p-4 bg-black/95 backdrop-blur-md text-white text-[10px] rounded-xl shadow-2xl border border-white/10 leading-relaxed font-medium z-50">
                      {ratingTooltipContent}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/95"></div>
                    </div>
                  </div>
                  <h3 className="font-black text-green-900 text-2xl uppercase tracking-tight">{analysisInputs.name}</h3>
                  {result.preciseRating && (
                      <div className="mt-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-lime-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">AI Precision Rating</p>
                        <p className="text-3xl font-black text-green-900">{getCoachingAlerts(poses?.[0]).filter(a => !a.isGood).length >= 3 ? 'F' : result.preciseRating.toFixed(3)}</p>
                      </div>
                  )}
                </div>

                {/* Skill Analysis Radar Section */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-xl flex flex-col justify-center min-h-[300px]">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 mb-6 text-center">Skill Analysis Radar</h4>
                  {result.radarStats ? (
                    <div className="w-full h-full min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                          { subject: 'Power', A: result.radarStats.power, fullMark: 100 },
                          { subject: 'Control', A: result.radarStats.control, fullMark: 100 },
                          { subject: 'Footwork', A: result.radarStats.footwork, fullMark: 100 },
                          { subject: 'Strategy', A: result.radarStats.strategy, fullMark: 100 },
                          { subject: 'Spin', A: result.radarStats.spin, fullMark: 100 },
                        ]}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#14532d', fontSize: 10, fontWeight: 'bold' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name={analysisInputs.name} dataKey="A" stroke="#84cc16" fill="#a3e635" fillOpacity={0.5} dot={false} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-stone-400 text-xs font-bold uppercase">
                      Radar data unavailable
                    </div>
                  )}
                </div>
              </div>

              {/* Pro Critique Section */}
              <div className="bg-green-900 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-lime-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-lime-400 mb-4 relative z-10">Pro Critique</h4>
                <p className="text-base md:text-lg leading-relaxed font-medium relative z-10">"{result.summary}"</p>
              </div>

              {/* Player Card Section */}
              {capturedFrame && result.preciseRating && (
                <div className="relative">
                  <PlayerCard 
                      capturedFrame={capturedFrame} 
                      result={result} 
                      analysisInputs={analysisInputs} 
                      poses={poses}
                  />
                </div>
              )}

              {/* Improvement Plan Section */}
              {result.improvementPlan && result.improvementPlan.length > 0 && (
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                     <h4 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Select Your Improvement Plan</h4>
                     <span className="text-[10px] bg-green-900 text-white px-4 py-2 rounded-full uppercase font-bold tracking-widest">Click to Activate</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {result.improvementPlan.map((plan, i) => {
                      const isSelected = selectedPlanIndex === i;
                      return (
                        <button 
                          key={i} 
                          onClick={() => handleSelectPlan(plan, i)}
                          className={`p-5 rounded-3xl border shadow-lg flex flex-col gap-3 group transition-all text-left relative overflow-hidden ${isSelected ? 'bg-green-900 text-white border-green-900 scale-[1.02] z-10' : 'bg-stone-50 border-stone-200 hover:scale-[1.01] hover:bg-white'}`}
                        >
                           {isSelected && (
                             <div className="absolute top-3 right-3 text-lime-400">
                               <i className="fas fa-check-circle text-xl"></i>
                             </div>
                           )}
                           <div className={`text-[9px] font-black px-3 py-1.5 rounded-lg w-fit uppercase tracking-widest shadow-md transition-colors ${isSelected ? 'bg-white text-green-900' : 'bg-green-900 text-white'}`}>
                             Option {i+1}
                           </div>
                           <p className={`text-xs font-bold leading-relaxed ${isSelected ? 'text-white/90' : 'text-stone-600'}`}>{plan}</p>
                           {isSelected && <p className="text-[8px] font-black uppercase tracking-widest text-lime-400 mt-auto pt-2">Active Plan</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5-Step Drive Analysis text report removed as per user request */}

              {/* Removed "Not a Drive Shot" block as per user request */}
            </div>
          )}

          {/* Future AI Analysis Wishlist */}
          <div className="mt-12 bg-[#fcfbf8] border border-stone-200 rounded-[2.5rem] p-8 md:p-10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e07a5f] via-[#c4a750] to-[#81b29a]"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-stone-800 font-black text-xl md:text-2xl uppercase tracking-tight mb-2">Future AI Analysis</h3>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">
                  <i className="fas fa-info-circle text-[#c4a750] mr-2"></i>
                  Currently optimized for Forehand/Backhand Drives
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Driving Shot */}
              <div className="bg-lime-500/10 border-2 border-lime-500/20 rounded-2xl p-5 flex flex-col gap-3 relative group hover:shadow-md transition-all hover:-translate-y-1">
                <div className="absolute top-3 right-3 text-lime-600 text-xs">
                  <i className="fas fa-unlock"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-lime-500/30 shadow-sm">
                  <i className="fas fa-table-tennis text-lime-600"></i>
                </div>
                <div>
                  <h4 className="text-stone-800 font-black text-sm mb-1">Driving Shot</h4>
                  <p className="text-lime-600 text-[10px] uppercase tracking-widest font-bold">Biomechanical Scan</p>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-lime-500/20">
                  <span className="text-[10px] text-lime-600/80 font-bold uppercase tracking-widest">Status</span>
                  <span className="text-lime-600 font-black text-xs flex items-center gap-1">
                    Unlocked
                  </span>
                </div>
              </div>

              {/* Backhand Volley */}
              <div className="bg-[#D98B79]/10 border-2 border-[#D98B79]/20 rounded-2xl p-5 flex flex-col gap-3 relative group hover:shadow-md transition-all hover:-translate-y-1">
                <div className="absolute top-3 right-3 text-[#D98B79]/60 text-xs">
                  <i className="fas fa-lock"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#D98B79]/30 shadow-sm">
                  <i className="fas fa-table-tennis text-[#D98B79]"></i>
                </div>
                <div>
                  <h4 className="text-stone-800 font-black text-sm mb-1">Backhand Volley</h4>
                  <p className="text-[#D98B79] text-[10px] uppercase tracking-widest font-bold">Biomechanical Scan</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#D98B79]/70 mr-1">Interest:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRating('backhand_volley', star)}
                      className={`transition-colors ${star <= (profile.surveyResponses?.['backhand_volley'] || 0) ? 'text-[#D98B79]' : 'text-[#D98B79]/20 hover:text-[#D98B79]/50'}`}
                    >
                      <i className="fas fa-star text-sm"></i>
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#D98B79]/20">
                  <span className="text-[10px] text-[#D98B79]/80 font-bold uppercase tracking-widest">Cost</span>
                  <span className="text-[#D98B79] font-black text-xs flex items-center gap-1">
                    <i className="fas fa-bolt text-[10px]"></i> 50 Sparks
                  </span>
                </div>
              </div>

              {/* Serve Analysis */}
              <div className="bg-[#8EA3A6]/10 border-2 border-[#8EA3A6]/20 rounded-2xl p-5 flex flex-col gap-3 relative group hover:shadow-md transition-all hover:-translate-y-1">
                <div className="absolute top-3 right-3 text-[#8EA3A6]/60 text-xs">
                  <i className="fas fa-lock"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#8EA3A6]/30 shadow-sm">
                  <i className="fas fa-bolt text-[#8EA3A6]"></i>
                </div>
                <div>
                  <h4 className="text-stone-800 font-black text-sm mb-1">Serve Analysis</h4>
                  <p className="text-[#8EA3A6] text-[10px] uppercase tracking-widest font-bold">Biomechanical Scan</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#8EA3A6]/70 mr-1">Interest:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRating('serve_analysis', star)}
                      className={`transition-colors ${star <= (profile.surveyResponses?.['serve_analysis'] || 0) ? 'text-[#8EA3A6]' : 'text-[#8EA3A6]/20 hover:text-[#8EA3A6]/50'}`}
                    >
                      <i className="fas fa-star text-sm"></i>
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#8EA3A6]/20">
                  <span className="text-[10px] text-[#8EA3A6]/80 font-bold uppercase tracking-widest">Cost</span>
                  <span className="text-[#8EA3A6] font-black text-xs flex items-center gap-1">
                    <i className="fas fa-bolt text-[10px]"></i> 50 Sparks
                  </span>
                </div>
              </div>

              {/* Context-Aware Coaching */}
              <div className="bg-[#81b29a]/10 border-2 border-[#81b29a]/20 rounded-2xl p-5 flex flex-col gap-3 relative group hover:shadow-md transition-all hover:-translate-y-1">
                <div className="absolute top-3 right-3 text-[#81b29a]/60 text-xs">
                  <i className="fas fa-lock"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#81b29a]/30 shadow-sm">
                  <i className="fas fa-brain text-[#81b29a]"></i>
                </div>
                <div>
                  <h4 className="text-stone-800 font-black text-sm mb-1">Context-Aware Coaching</h4>
                  <p className="text-[#81b29a] text-[10px] uppercase tracking-widest font-bold">Situational Analysis</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#81b29a]/70 mr-1">Interest:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRating('context_coaching', star)}
                      className={`transition-colors ${star <= (profile.surveyResponses?.['context_coaching'] || 0) ? 'text-[#81b29a]' : 'text-[#81b29a]/20 hover:text-[#81b29a]/50'}`}
                    >
                      <i className="fas fa-star text-sm"></i>
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#81b29a]/20">
                  <span className="text-[10px] text-[#81b29a]/80 font-bold uppercase tracking-widest">Cost</span>
                  <span className="text-[#81b29a] font-black text-xs flex items-center gap-1">
                    <i className="fas fa-bolt text-[10px]"></i> 50 Sparks
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      <AnimatePresence>
        {showCropModal && capturedFrame && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm flex items-center gap-2">
                  <i className="fas fa-crop-alt text-blue-500"></i> Crop Image
                </h3>
                <button 
                  onClick={() => setShowCropModal(false)}
                  className="text-stone-400 hover:text-rose-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="p-6 overflow-auto flex-1 flex items-center justify-center bg-stone-900/5">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  className="max-h-[60vh]"
                >
                  <img 
                    ref={imgRef}
                    src={capturedFrame} 
                    alt="Crop me" 
                    className="max-h-[60vh] object-contain"
                    onLoad={(e) => {
                      const { width, height } = e.currentTarget;
                      setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
                    }}
                  />
                </ReactCrop>
              </div>

              <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowCropModal(false)}
                  className="px-6 py-2 rounded-xl font-bold text-stone-500 hover:bg-stone-200 transition-colors text-sm uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  onClick={applyCrop}
                  className="px-6 py-2 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-all text-sm uppercase tracking-wider flex items-center gap-2"
                >
                  <i className="fas fa-check"></i> Apply Crop
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PlayerClassification;
