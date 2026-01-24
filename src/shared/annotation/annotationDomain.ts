import { PipelinePatternType, AnnotationColorScheme } from '../types';
import { DEFAULT_ANNOTATION_COLOR_SCHEME } from './annotationConstants';

export function generateAnnotationId(): string {
  return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getPatternColor(
  patternType: PipelinePatternType,
  patternSubtype: string,
  colorScheme: AnnotationColorScheme = DEFAULT_ANNOTATION_COLOR_SCHEME
): string {
  const patternColors = colorScheme[patternType];
  if (patternColors && patternSubtype in patternColors) {
    return (patternColors as any)[patternSubtype];
  }
  return '#6B7280';
}
