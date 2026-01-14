import { IParser } from './IParser';
import { PipelineData } from '../../shared/types';

export class CustomParser implements IParser {
    name = 'Custom Pipeline';

    canParse(fileName: string, content: string): boolean {
        return fileName.endsWith('caldera.json');
    }

    parse(content: string): PipelineData {
        try {
            const data = JSON.parse(content);
            return {
                framework: data.framework || this.name,
                nodes: data.nodes || [],
                edges: data.edges || []
            };
        } catch (e) {
            console.error('Failed to parse caldera.json', e);
            return { framework: 'Error', nodes: [], edges: [] };
        }
    }
}
