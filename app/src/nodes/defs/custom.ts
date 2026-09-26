import { NotebookPen } from 'lucide-react';
import type { NodeDef, OutputDef, ValueType } from '../types';
import { STORE_KEY, clip, rows, str } from '../helpers';

export const instruction: NodeDef = {
  type: 'custom.instruction',
  category: 'custom',
  label: 'AI에게 맡기기',
  description: '노드로 만들기 어려운 동작을 말로 설명하면 코드 생성 AI가 구현합니다.',
  icon: NotebookPen,
  fields: [
    {
      key: 'instruction', label: '할 일', kind: 'textarea', required: true, maxLength: 3000, refs: true,
      placeholder: '{{n1.content}}에서 욕설을 찾아 ***로 가린 문장을 만든다.',
    },
    {
      key: 'outputs', label: '결과로 내보낼 값', kind: 'table', maxRows: 5, addLabel: '출력값 추가',
      help: '뒤 노드에서 쓸 값을 정해 두면 AI가 그 이름으로 값을 넘겨줍니다.',
      columns: [
        { key: 'key', label: '이름', kind: 'text', required: true, pattern: STORE_KEY, placeholder: 'cleaned', unique: true },
        {
          key: 'type', label: '종류', kind: 'select', default: 'text',
          options: [
            { value: 'text', label: '텍스트' },
            { value: 'number', label: '숫자' },
            { value: 'boolean', label: '참/거짓' },
            { value: 'list', label: '목록' },
          ],
        },
        { key: 'description', label: '설명', kind: 'text', maxLength: 200, placeholder: '욕설을 가린 문장' },
      ],
    },
  ],
  outputs: (p) =>
    rows(p, 'outputs')
      .filter((r) => typeof r.key === 'string' && r.key)
      .map((r): OutputDef => ({ key: String(r.key), label: String(r.description || r.key), type: (r.type as ValueType) || 'text' })),
  summary: (p) => clip(str(p, 'instruction') || '지시 없음', 44),
};

export const customDefs = [instruction];
