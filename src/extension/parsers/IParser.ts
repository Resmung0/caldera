import { PipelineData } from '../../shared/types';

export interface IParser {
    name: string;
    canParse(fileName: string, content: string): boolean;
    parse(content: string): PipelineData;
}
