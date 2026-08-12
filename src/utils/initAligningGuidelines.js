/**
 * Advanced Smart Alignment Guidelines for Fabric.js
 * Creates Canva/Figma style alignment guides when dragging objects.
 */
export function initAligningGuidelines(canvas) {
  const ctx = canvas.getSelectionContext();
  const aligningLineOffset = 5;
  const aligningLineMargin = 4;
  const aligningLineWidth = 1;
  const aligningLineColor = '#E91E63'; // Magenta Canva Style
  let verticalLines = [];
  let horizontalLines = [];

  canvas.on('mouse:down', () => {
    verticalLines = [];
    horizontalLines = [];
  });

  canvas.on('object:moving', (e) => {
    const activeObject = e.target;
    if (!activeObject) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const zoom = canvas.getZoom();

    const logicalWidth = canvasWidth / zoom;
    const logicalHeight = canvasHeight / zoom;
    
    verticalLines = [];
    horizontalLines = [];

    const activeObjCenter = activeObject.getCenterPoint();
    const activeObjBound = activeObject.getBoundingRect();
    
    // Correctly map logical centers
    const canvasCenterX = logicalWidth / 2;
    const canvasCenterY = logicalHeight / 2;

    let snapX = false;
    let snapY = false;

    // Helper to draw vertical lines
    const drawVerticalLine = (x) => {
      verticalLines.push({
        x: x,
        y1: 0,
        y2: logicalHeight
      });
    };

    // Helper to draw horizontal lines
    const drawHorizontalLine = (y) => {
      horizontalLines.push({
        y: y,
        x1: 0,
        x2: logicalWidth
      });
    };

    // Snapping logic - Canvas Center X
    if (Math.abs(activeObjCenter.x - canvasCenterX) < aligningLineOffset) {
      activeObject.set({ left: activeObject.left + (canvasCenterX - activeObjCenter.x) });
      drawVerticalLine(canvasCenterX);
      snapX = true;
    }
    
    // Snapping logic - Canvas Center Y
    if (Math.abs(activeObjCenter.y - canvasCenterY) < aligningLineOffset) {
      activeObject.set({ top: activeObject.top + (canvasCenterY - activeObjCenter.y) });
      drawHorizontalLine(canvasCenterY);
      snapY = true;
    }

    // Object to Object Snapping
    const objects = canvas.getObjects().filter((obj) => obj !== activeObject);
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.isBackground) continue;

      const objCenter = obj.getCenterPoint();
      const objBound = obj.getBoundingRect();

      // X Axis Snapping (Centers, Left, Right)
      if (!snapX) {
        if (Math.abs(activeObjCenter.x - objCenter.x) < aligningLineOffset) {
          activeObject.set({ left: activeObject.left + (objCenter.x - activeObjCenter.x) });
          drawVerticalLine(objCenter.x);
          snapX = true;
        } else if (Math.abs(activeObjBound.left - objBound.left) < aligningLineOffset) {
          activeObject.set({ left: activeObject.left + (objBound.left - activeObjBound.left) });
          drawVerticalLine(objBound.left);
          snapX = true;
        } else if (Math.abs((activeObjBound.left + activeObjBound.width) - (objBound.left + objBound.width)) < aligningLineOffset) {
          activeObject.set({ left: activeObject.left + ((objBound.left + objBound.width) - (activeObjBound.left + activeObjBound.width)) });
          drawVerticalLine(objBound.left + objBound.width);
          snapX = true;
        }
      }

      // Y Axis Snapping (Centers, Top, Bottom)
      if (!snapY) {
        if (Math.abs(activeObjCenter.y - objCenter.y) < aligningLineOffset) {
          activeObject.set({ top: activeObject.top + (objCenter.y - activeObjCenter.y) });
          drawHorizontalLine(objCenter.y);
          snapY = true;
        } else if (Math.abs(activeObjBound.top - objBound.top) < aligningLineOffset) {
          activeObject.set({ top: activeObject.top + (objBound.top - activeObjBound.top) });
          drawHorizontalLine(objBound.top);
          snapY = true;
        } else if (Math.abs((activeObjBound.top + activeObjBound.height) - (objBound.top + objBound.height)) < aligningLineOffset) {
          activeObject.set({ top: activeObject.top + ((objBound.top + objBound.height) - (activeObjBound.top + activeObjBound.height)) });
          drawHorizontalLine(objBound.top + objBound.height);
          snapY = true;
        }
      }
    }
  });

  canvas.on('before:render', () => {
    // Clear lines before next render pass if mouse is up
    if (verticalLines.length === 0 && horizontalLines.length === 0 && canvas.contextTop) {
      canvas.clearContext(canvas.contextTop);
    }
  });

  canvas.on('after:render', () => {
    // Draw lines after all objects are rendered
    const ctx = canvas.getContext();
    if (!ctx) return;
    
    // Usually guidelines are drawn on the top context so they overlay objects
    const drawCtx = canvas.contextTop || ctx;
    
    // We only want to clear if we actually have lines to draw to avoid destroying other top-canvas things, 
    // but Fabric handles standard topCanvas clearing.
    
    verticalLines.forEach((line) => {
      drawLine(drawCtx, line.x, line.y1, line.x, line.y2);
    });

    horizontalLines.forEach((line) => {
      drawLine(drawCtx, line.x1, line.y, line.x2, line.y);
    });
  });

  canvas.on('mouse:up', () => {
    verticalLines = [];
    horizontalLines = [];
    canvas.renderAll();
  });

  function drawLine(ctx, x1, y1, x2, y2) {
    if (!ctx) return;
    ctx.save();
    ctx.lineWidth = aligningLineWidth;
    ctx.strokeStyle = aligningLineColor;
    
    // Setup dashed line for aesthetic
    ctx.beginPath();
    ctx.setLineDash([4, 4]);

    const zoom = canvas.getZoom();
    const panX = canvas.viewportTransform ? canvas.viewportTransform[4] : 0;
    const panY = canvas.viewportTransform ? canvas.viewportTransform[5] : 0;

    ctx.moveTo(x1 * zoom + panX, y1 * zoom + panY);
    ctx.lineTo(x2 * zoom + panX, y2 * zoom + panY);
    ctx.stroke();
    ctx.restore();
  }
} // End of initAligningGuidelines
