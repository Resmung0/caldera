import { PipelineAnnotation, AnnotationBounds, AnnotationColorScheme, PipelinePatternType } from './types';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedAnnotation {
  annotation: PipelineAnnotation;
  bounds: AnnotationBounds;
  renderOrder: number;
  style: AnnotationStyle;
}

export interface AnnotationStyle {
  borderColor: string;
  backgroundColor: string;
  shadowColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
}

/**
 * AnnotationRenderer service handles the calculation and styling of annotation boundaries.
 * It manages optimal boundary rendering, pattern-specific colors, overlapping scenarios, and theme support.
 * 
 * Requirements addressed:
 * - 4.1: Calculate optimal boundary rendering for grouped nodes
 * - 4.2: Apply pattern-specific colors and styling  
 * - 4.3: Handle overlapping annotation scenarios
 * - 4.4: Ensure annotations don't obscure content
 * - 4.5: Implement dark theme support
 */
export class AnnotationRenderer {
  private colorScheme: AnnotationColorScheme;
  private isDarkTheme: boolean;

  constructor(colorScheme: AnnotationColorScheme, isDarkTheme: boolean = true) {
    this.colorScheme = colorScheme;
    this.isDarkTheme = isDarkTheme;
  }

  /**
   * Calculate optimal boundary for a group of nodes
   */
  calculateOptimalBounds(nodeIds: string[], nodePositions: NodePosition[]): AnnotationBounds | null {
    const relevantNodes = nodePositions.filter(node => nodeIds.includes(node.id));

    if (relevantNodes.length === 0) {
      return null;
    }

    // Find the bounding rectangle
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    relevantNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    // Calculate optimal padding based on node count and distribution
    const padding = this.calculateOptimalPadding(relevantNodes);

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + (padding * 2),
      height: maxY - minY + (padding * 2),
      padding
    };
  }

  /**
   * Calculate optimal padding based on node distribution
   */
  private calculateOptimalPadding(nodes: NodePosition[]): number {
    const basePadding = 16;

    if (nodes.length === 1) {
      return basePadding;
    }

    // For multiple nodes, calculate spacing and adjust padding
    const avgSpacing = this.calculateAverageNodeSpacing(nodes);
    const paddingMultiplier = Math.min(1.5, Math.max(0.8, avgSpacing / 100));

    return Math.round(basePadding * paddingMultiplier);
  }

  /**
   * Calculate average spacing between nodes
   */
  private calculateAverageNodeSpacing(nodes: NodePosition[]): number {
    if (nodes.length < 2) return 0;

    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        pairCount++;
      }
    }

    return pairCount > 0 ? totalDistance / pairCount : 0;
  }

  /**
   * Apply pattern-specific colors and styling
   */
  getPatternStyle(annotation: PipelineAnnotation): AnnotationStyle {
    const baseColor = this.getPatternColor(annotation.patternType, annotation.patternSubtype);

    return {
      borderColor: baseColor,
      backgroundColor: this.addAlpha(baseColor, 0.08), // 8% opacity for background
      shadowColor: this.addAlpha(baseColor, 0.25), // 25% opacity for shadow
      borderWidth: 2,
      borderRadius: 12,
      opacity: this.isDarkTheme ? 0.9 : 0.8
    };
  }

  /**
   * Get color for specific pattern type and subtype
   */
  private getPatternColor(patternType: PipelinePatternType, patternSubtype: string): string {
    const patternColors = this.colorScheme[patternType];

    if (!patternColors) {
      return '#f20d63'; // Fallback color
    }

    // Map subtype to color key
    const colorKey = this.mapSubtypeToColorKey(patternType, patternSubtype);
    return patternColors[colorKey] || '#f20d63';
  }

  /**
   * Map pattern subtype to color scheme key
   */
  private mapSubtypeToColorKey(patternType: PipelinePatternType, patternSubtype: string): string {
    const subtypeMap: Record<PipelinePatternType, Record<string, string>> = {
      [PipelinePatternType.CICD]: {
        'Testing': 'testing',
        'Build': 'build'
      },
      [PipelinePatternType.DATA_PROCESSING]: {
        'Model Inference': 'modelInference',
        'Model Training': 'modelTraining',
        'ETL/ELT': 'etl',
        'Webscraping': 'webscraping'
      },
      [PipelinePatternType.AI_AGENT]: {
        'Prompt Chaining': 'promptChaining',
        'Routing': 'routing',
        'Parallelization': 'parallelization',
        'Orchestrator Workers': 'orchestratorWorkers',
        'Evaluator Optimizer': 'evaluatorOptimizer'
      },
      [PipelinePatternType.RPA]: {
        'Browse Automation': 'browseAutomation'
      }
    };

    return subtypeMap[patternType]?.[patternSubtype] || Object.keys(subtypeMap[patternType] || {})[0] || 'default';
  }

  /**
   * Handle overlapping annotation scenarios by calculating render order
   */
  calculateRenderOrder(annotations: PipelineAnnotation[], nodePositions: NodePosition[]): RenderedAnnotation[] {
    const renderedAnnotations: RenderedAnnotation[] = [];

    // Calculate bounds for all annotations
    const annotationsWithBounds = annotations.map(annotation => ({
      annotation,
      bounds: this.calculateOptimalBounds(annotation.nodeIds, nodePositions)
    })).filter(item => item.bounds !== null);

    // Sort by area (smaller annotations render on top)
    annotationsWithBounds.sort((a, b) => {
      const areaA = a.bounds!.width * a.bounds!.height;
      const areaB = b.bounds!.width * b.bounds!.height;
      return areaB - areaA; // Larger areas first (lower z-index)
    });

    // Assign render order and detect overlaps
    annotationsWithBounds.forEach((item, index) => {
      const renderOrder = index;
      const style = this.getPatternStyle(item.annotation);

      // Adjust style for overlapping annotations
      const overlappingCount = this.countOverlappingAnnotations(
        item.bounds!,
        annotationsWithBounds.slice(0, index).map(a => a.bounds!)
      );

      if (overlappingCount > 0) {
        // Increase border width and adjust opacity for overlapping annotations
        style.borderWidth = Math.min(4, style.borderWidth + overlappingCount);
        style.opacity = Math.max(0.6, style.opacity - (overlappingCount * 0.1));
      }

      renderedAnnotations.push({
        annotation: item.annotation,
        bounds: item.bounds!,
        renderOrder,
        style
      });
    });

    return renderedAnnotations;
  }

  /**
   * Count how many existing bounds overlap with the given bounds
   */
  private countOverlappingAnnotations(bounds: AnnotationBounds, existingBounds: AnnotationBounds[]): number {
    return existingBounds.filter(existing => this.boundsOverlap(bounds, existing)).length;
  }

  /**
   * Check if two annotation bounds overlap
   */
  private boundsOverlap(bounds1: AnnotationBounds, bounds2: AnnotationBounds): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }

  /**
   * Add alpha channel to hex color
   */
  private addAlpha(hexColor: string, alpha: number): string {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Update theme and recalculate styles if needed
   */
  updateTheme(isDarkTheme: boolean): void {
    this.isDarkTheme = isDarkTheme;
  }

  /**
   * Update color scheme
   */
  updateColorScheme(colorScheme: AnnotationColorScheme): void {
    this.colorScheme = colorScheme;
  }

  /**
   * Get default color scheme for dark/light theme
   */
  static getDefaultColorScheme(isDarkTheme: boolean = true): AnnotationColorScheme {
    if (isDarkTheme) {
      return {
        [PipelinePatternType.CICD]: {
          testing: '#10b981', // Emerald
          build: '#3b82f6'    // Blue
        },
        [PipelinePatternType.DATA_PROCESSING]: {
          modelInference: '#8b5cf6',  // Violet
          modelTraining: '#f59e0b',   // Amber
          etl: '#06b6d4',          // Cyan
          webscraping: '#84cc16'      // Lime
        },
        [PipelinePatternType.AI_AGENT]: {
          promptChaining: '#f20d63',      // Pink (brand color)
          routing: '#ec4899',             // Pink-500
          parallelization: '#a855f7',     // Purple-500
          orchestratorWorkers: '#6366f1', // Indigo-500
          evaluatorOptimizer: '#14b8a6'   // Teal-500
        },
        [PipelinePatternType.RPA]: {
          browseAutomation: '#f97316' // Orange
        }
      };
    } else {
      // Light theme colors (darker variants)
      return {
        [PipelinePatternType.CICD]: {
          testing: '#059669', // Emerald-600
          build: '#2563eb'    // Blue-600
        },
        [PipelinePatternType.DATA_PROCESSING]: {
          modelInference: '#7c3aed',  // Violet-600
          modelTraining: '#d97706',   // Amber-600
          etl: '#0891b2',          // Cyan-600
          webscraping: '#65a30d'      // Lime-600
        },
        [PipelinePatternType.AI_AGENT]: {
          promptChaining: '#be185d',      // Pink-700
          routing: '#db2777',             // Pink-600
          parallelization: '#9333ea',     // Purple-600
          orchestratorWorkers: '#4f46e5', // Indigo-600
          evaluatorOptimizer: '#0f766e'   // Teal-600
        },
        [PipelinePatternType.RPA]: {
          browseAutomation: '#ea580c' // Orange-600
        }
      };
    }
  }
}