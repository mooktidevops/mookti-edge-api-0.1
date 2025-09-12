# Quick Answer Tool Content Acquisition & Storage Plan
*Date: September 8, 2025*

## Executive Summary
Plan to acquire, process, and store reference content for the Quick Answer Tool, which needs direct factual information without pedagogical framing.

## Current Architecture Analysis

### Storage Infrastructure
- **Vector Database**: Pinecone (mookti-vectors index)
- **Embeddings**: Voyage AI (voyage-2 model)
- **KV Store**: Vercel KV (Redis) for metadata
- **Namespaces**: Currently using 'conversations', need new namespace for reference content

### Existing Namespaces (from CONTENT_GAP_ANALYSIS.md)
- public-core: Learning theory
- public-coaching: Writing guidance  
- public-writing: Essay structure
- public-remedial: Basic concepts
- public-growth: Metacognition

## Proposed Architecture for Quick Answer Content

### 1. New Pinecone Namespaces
```
reference-facts/        # Quick factual lookups
├── math/              # Mathematical formulas, theorems
├── science/           # Scientific constants, definitions
├── history/           # Dates, events, figures
├── language/          # Grammar rules, vocabulary
└── general/           # Cross-disciplinary facts
```

### 2. Content Structure
Each vector entry will contain:
```json
{
  "id": "unique-id",
  "values": [embedding],
  "metadata": {
    "content": "The quadratic formula is x = (-b ± √(b²-4ac)) / 2a",
    "type": "formula|definition|fact|constant|theorem",
    "subject": "mathematics|physics|chemistry|biology|history|etc",
    "topic": "algebra|mechanics|organic-chemistry|etc",
    "source": "OpenStax-Algebra-Ch3|MIT-OCW-18.01|etc",
    "sourceUrl": "https://...",
    "license": "CC-BY|MIT|etc",
    "accuracy": "verified|peer-reviewed|provisional",
    "lastUpdated": "2025-09-08",
    "keywords": ["quadratic", "formula", "equation", "roots"],
    "difficulty": "basic|intermediate|advanced",
    "relatedConcepts": ["discriminant", "parabola", "roots"]
  }
}
```

### 3. Content Sources & Processing Pipeline

#### Phase 1: OpenStax Textbooks (Week 1)
**Source**: OpenStax offers free, peer-reviewed textbooks under CC-BY license
**Content Types**: Glossaries, key formulas, chapter summaries

**Processing Steps**:
1. Download OpenStax books (JSON/XML format available)
2. Extract glossary terms and definitions
3. Extract formula boxes and equation references
4. Extract "Key Terms" and "Key Equations" sections
5. Clean and standardize formatting
6. Generate embeddings via Voyage AI
7. Store in Pinecone with metadata

**Target Books**:
- Algebra and Trigonometry
- Calculus (Volumes 1-3)
- Chemistry 2e
- Biology 2e
- Physics
- US History
- Psychology 2e
- Economics 2e

#### Phase 2: MIT OCW Formula Sheets (Week 1)
**Source**: MIT OpenCourseWare formula sheets and reference materials
**Content Types**: Formula sheets, constant tables, reference guides

**Processing Steps**:
1. Scrape/download PDF formula sheets
2. Use PDF parsing to extract formulas (consider using pdf-parse or PyPDF2)
3. Convert LaTeX/MathML to readable format
4. Chunk into atomic facts
5. Generate embeddings
6. Store with MIT-OCW attribution

**Target Courses**:
- 18.01 Single Variable Calculus
- 18.02 Multivariable Calculus
- 8.01 Physics I
- 8.02 Physics II
- 5.111 Principles of Chemical Science

#### Phase 3: Wikidata/DBpedia Facts (Week 2)
**Source**: Structured data from Wikidata SPARQL endpoint
**Content Types**: Historical dates, scientific constants, geographical facts

**Processing Steps**:
1. Query Wikidata for structured facts
2. Filter for educational relevance
3. Format into natural language statements
4. Generate embeddings
5. Store with Wikidata attribution

**Example SPARQL Query**:
```sparql
SELECT ?item ?itemLabel ?date ?dateLabel WHERE {
  ?item wdt:P31 wd:Q178561 . # battles
  ?item wdt:P585 ?date .      # point in time
  FILTER(YEAR(?date) >= 1700 && YEAR(?date) <= 2000)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
```

### 4. Storage Implementation

#### A. Pinecone Index Configuration
```typescript
// Create new namespace for reference content
const referenceNamespace = pineconeIndex.namespace('reference-facts');

// Upsert vectors with rich metadata
await referenceNamespace.upsert([{
  id: `openstax-algebra-${chapterId}-${termId}`,
  values: embedding,
  metadata: {
    content: cleanedContent,
    type: 'formula',
    subject: 'mathematics',
    topic: 'algebra',
    source: 'OpenStax-Algebra-2e',
    sourceUrl: 'https://openstax.org/books/algebra-2e',
    license: 'CC-BY-4.0',
    accuracy: 'peer-reviewed',
    lastUpdated: new Date().toISOString(),
    keywords: extractedKeywords,
    difficulty: 'intermediate',
    relatedConcepts: relatedTerms
  }
}]);
```

#### B. Vercel KV Metadata Storage
```typescript
// Store source document metadata
await kv.hset('reference:sources', {
  'openstax-algebra-2e': {
    title: 'Algebra and Trigonometry 2e',
    publisher: 'OpenStax',
    url: 'https://openstax.org/books/algebra-2e',
    license: 'CC-BY-4.0',
    lastFetched: Date.now(),
    totalFacts: 1250,
    chapters: 15
  }
});

// Track content statistics
await kv.hincrby('reference:stats', 'total_facts', 1);
await kv.hincrby('reference:stats:math', 'formulas', 1);
```

### 5. Content Ingestion Pipeline

#### Architecture
```
[OpenStax API] → [Fetcher] → [Parser] → [Chunker] → [Embedder] → [Pinecone]
                     ↓           ↓          ↓           ↓
                  [KV Cache] [Validator] [Deduper] [Quality Check]
```

#### Implementation Plan
```typescript
// src/services/content-ingestion/quick-answer-ingestion.ts

interface ContentSource {
  fetchContent(): Promise<RawContent[]>;
  parseContent(raw: RawContent): ParsedContent[];
  chunkContent(parsed: ParsedContent): ContentChunk[];
  validateContent(chunk: ContentChunk): boolean;
}

class OpenStaxIngester implements ContentSource {
  async fetchContent() {
    // Fetch from OpenStax API
  }
  
  async parseContent(raw) {
    // Extract glossaries, formulas
  }
  
  async chunkContent(parsed) {
    // Break into atomic facts
  }
  
  async validateContent(chunk) {
    // Ensure quality and completeness
  }
}

class QuickAnswerContentPipeline {
  async ingest(source: ContentSource) {
    const raw = await source.fetchContent();
    const parsed = await source.parseContent(raw);
    const chunks = await source.chunkContent(parsed);
    
    for (const chunk of chunks) {
      if (await this.isDuplicate(chunk)) continue;
      if (!source.validateContent(chunk)) continue;
      
      const embedding = await this.generateEmbedding(chunk);
      await this.storeInPinecone(chunk, embedding);
      await this.updateMetadata(chunk);
    }
  }
}
```

### 6. Retrieval Optimization for Quick Answers

#### Query Strategy
```typescript
class QuickAnswerRetriever {
  async retrieve(query: string, limit: number = 3) {
    // 1. Generate embedding for query
    const queryEmbedding = await voyageClient.embed({
      input: [query],
      model: 'voyage-2'
    });
    
    // 2. Search with metadata filters
    const results = await pineconeIndex
      .namespace('reference-facts')
      .query({
        vector: queryEmbedding.data[0].embedding,
        topK: limit,
        filter: {
          type: { $in: ['formula', 'definition', 'fact'] },
          accuracy: { $in: ['verified', 'peer-reviewed'] }
        },
        includeMetadata: true
      });
    
    // 3. Post-process for direct answers
    return results.matches.map(match => ({
      content: match.metadata.content,
      confidence: match.score,
      source: match.metadata.source,
      sourceUrl: match.metadata.sourceUrl
    }));
  }
}
```

### 7. Success Metrics

#### Coverage Metrics
- Total facts indexed: Target 10,000+ in first month
- Subject coverage: 8+ major subjects
- Source diversity: 5+ authoritative sources

#### Quality Metrics
- Accuracy rate: >98% (peer-reviewed sources only)
- Retrieval precision: >0.85 for factual queries
- Response time: <500ms for retrieval

#### Usage Metrics
- Quick Answer tool activation rate
- User satisfaction with factual responses
- Reduction in "I don't know" responses

### 8. Implementation Timeline

#### Week 1 (Sep 8-14)
- [ ] Set up Pinecone namespace structure
- [ ] Build OpenStax ingestion pipeline
- [ ] Process first 3 OpenStax books
- [ ] Implement basic retrieval for Quick Answer tool

#### Week 2 (Sep 15-21)
- [ ] Complete OpenStax ingestion (all books)
- [ ] Add MIT OCW formula sheets
- [ ] Implement deduplication system
- [ ] Add quality validation

#### Week 3 (Sep 22-28)
- [ ] Integrate Wikidata facts
- [ ] Build monitoring dashboard
- [ ] Optimize retrieval performance
- [ ] User testing and feedback

#### Week 4 (Sep 29-Oct 5)
- [ ] Scale to full content library
- [ ] Add incremental update system
- [ ] Performance optimization
- [ ] Documentation and handoff

### 9. Legal & Attribution

#### License Compliance
- OpenStax: CC-BY 4.0 (attribution required)
- MIT OCW: CC-BY-NC-SA (non-commercial, share-alike)
- Wikidata: CC0 (public domain)

#### Attribution Display
```typescript
// Every response must include source attribution
interface QuickAnswerResponse {
  answer: string;
  source: {
    name: string;      // "OpenStax Algebra 2e"
    url: string;       // Link to source
    license: string;   // "CC-BY-4.0"
    attribution: string; // Full attribution text
  };
}
```

### 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| Copyright violations | High | Only use open-licensed content |
| Outdated information | Medium | Regular update cycles, timestamp all content |
| Incorrect facts | High | Peer-reviewed sources only, validation pipeline |
| Poor retrieval quality | Medium | Multiple embedding models, A/B testing |
| Storage costs | Low | Optimize vector dimensions, prune unused content |

## Next Steps

1. **Immediate**: Create Pinecone namespace structure
2. **This Week**: Build OpenStax ingestion pipeline
3. **Next Week**: Process first batch of content
4. **Validation**: Test with Quick Answer tool

## Appendix: Content Examples

### Mathematics Formula
```json
{
  "content": "The quadratic formula: x = (-b ± √(b²-4ac)) / 2a, where a, b, and c are coefficients of ax² + bx + c = 0",
  "type": "formula",
  "subject": "mathematics",
  "topic": "algebra",
  "keywords": ["quadratic", "formula", "roots", "equation"]
}
```

### Science Constant
```json
{
  "content": "The speed of light in vacuum is 299,792,458 meters per second (c ≈ 3.00 × 10⁸ m/s)",
  "type": "constant",
  "subject": "physics",
  "topic": "fundamental-constants",
  "keywords": ["speed of light", "c", "constant", "vacuum"]
}
```

### Historical Fact
```json
{
  "content": "The American Revolution began on April 19, 1775, with the Battles of Lexington and Concord",
  "type": "fact",
  "subject": "history",
  "topic": "american-revolution",
  "keywords": ["American Revolution", "1775", "Lexington", "Concord"]
}
```