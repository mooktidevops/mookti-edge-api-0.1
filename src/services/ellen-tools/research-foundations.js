"use strict";
/**
 * Research-Backed Foundations for Ellen's Pedagogical Tools
 *
 * This module contains the evidence-based principles that guide
 * each of Ellen's core pedagogical tools.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormativeAssessmentPrinciples = exports.EmotionalSupportPrinciples = exports.CognitiveLoadPrinciples = exports.ResearchFoundations = void 0;
exports.ResearchFoundations = {
    socratic: {
        name: 'Socratic Method (Elenchus)',
        description: 'Guided inquiry through productive confusion',
        research: {
            // Chi et al. (2014) - ICAP Framework
            activeEngagement: {
                citation: 'Chi & Wylie (2014). The ICAP Framework',
                principle: 'Interactive > Constructive > Active > Passive learning',
                implementation: 'Socratic dialogue promotes interactive learning through question-response cycles'
            },
            // D'Mello & Graesser (2012) - Productive Confusion
            productiveConfusion: {
                citation: "D'Mello & Graesser (2012). Dynamics of affective states during complex learning",
                principle: 'Confusion-resolution cycles enhance deep learning when scaffolded appropriately',
                implementation: 'Aporia moments are carefully calibrated to create productive, not destructive, confusion'
            },
            // VanLehn (2011) - Assistance Dilemma
            assistanceDilemma: {
                citation: 'VanLehn (2011). The relative effectiveness of human tutoring',
                principle: 'Optimal assistance provides just enough help to maintain progress without undermining learning',
                implementation: 'Answer-first approach for specific questions, followed by deepening questions'
            },
            // Hattie & Timperley (2007) - Feedback Power
            feedbackModel: {
                citation: 'Hattie & Timperley (2007). The Power of Feedback',
                principle: 'Effective feedback addresses: Where am I going? How am I going? Where to next?',
                implementation: 'Feed-up, feed-back, feed-forward structure in responses'
            }
        },
        keyFeatures: [
            'Elenchus: Systematic questioning to expose inconsistencies',
            'Aporia: Productive confusion moments that motivate learning',
            'Maieutics: Drawing out latent knowledge through questioning',
            'Never harsh or judgmental - always encouraging',
            'Maximum 2 questions per exchange to prevent cognitive overload'
        ]
    },
    reflection: {
        name: 'Metacognitive Reflection Tool',
        description: 'Evidence-based prompts for self-regulated learning',
        research: {
            // Zimmerman (2002) - Self-Regulated Learning
            selfRegulation: {
                citation: 'Zimmerman (2002). Becoming a self-regulated learner',
                principle: 'Three phases: Forethought, Performance, Self-reflection',
                implementation: 'Structured reflection prompts following SRL cycle'
            },
            // Schraw & Dennison (1994) - Metacognitive Awareness
            metacognition: {
                citation: 'Schraw & Dennison (1994). Metacognitive Awareness Inventory',
                principle: 'Knowledge of cognition + Regulation of cognition = Better learning',
                implementation: 'Prompts target both declarative and procedural metacognitive knowledge'
            },
            // Boud et al. (1985) - Reflection in Learning
            reflectionCycle: {
                citation: 'Boud, Keogh & Walker (1985). Reflection: Turning experience into learning',
                principle: 'Return to experience → Attend to feelings → Re-evaluate experience',
                implementation: 'Three-stage reflection process with emotional awareness'
            },
            // Dunlosky et al. (2013) - Effective Study Techniques
            studyTechniques: {
                citation: 'Dunlosky et al. (2013). Improving students learning with effective techniques',
                principle: 'Self-explanation and elaborative interrogation show high utility',
                implementation: 'Reflection prompts encourage self-explanation of learning'
            }
        },
        keyFeatures: [
            'Calibrated difficulty assessment (metacognitive accuracy)',
            'Process-focused rather than outcome-focused',
            'Emotional awareness integration',
            'Connection-making between concepts',
            'Strategy evaluation and adjustment'
        ]
    },
    extension: {
        name: 'Knowledge Extension Tool',
        description: 'Connecting learning to broader contexts and applications',
        research: {
            // Bransford & Schwartz (1999) - Transfer of Learning
            transferLearning: {
                citation: 'Bransford & Schwartz (1999). Rethinking transfer',
                principle: 'Preparation for Future Learning (PFL) beats direct application',
                implementation: 'Extensions prepare learners for future learning opportunities'
            },
            // Gentner (2003) - Analogical Reasoning
            analogicalReasoning: {
                citation: 'Gentner & Markman (2003). Structure mapping in analogy',
                principle: 'Structural alignment facilitates knowledge transfer',
                implementation: 'Extensions use structural mapping to connect domains'
            },
            // Bloom's Taxonomy Revised (2001)
            cognitiveHierarchy: {
                citation: 'Anderson & Krathwohl (2001). A taxonomy for learning',
                principle: 'Higher-order thinking: Analyze, Evaluate, Create',
                implementation: 'Extensions progressively move up cognitive hierarchy'
            },
            // Situated Learning (1991)
            situatedCognition: {
                citation: 'Lave & Wenger (1991). Situated Learning',
                principle: 'Learning is fundamentally situated in context',
                implementation: 'Extensions connect abstract knowledge to real-world contexts'
            }
        },
        keyFeatures: [
            'Cross-domain connections',
            'Real-world applications',
            'Future learning preparation',
            'Progressive complexity increases',
            'Multiple representation formats'
        ]
    },
    genealogy: {
        name: 'Concept Genealogy Tool',
        description: 'Tracing the historical and conceptual evolution of ideas',
        research: {
            // Novak & Cañas (2008) - Concept Mapping
            conceptMapping: {
                citation: 'Novak & Cañas (2008). Theory underlying concept maps',
                principle: 'Hierarchical organization with cross-links enhances understanding',
                implementation: 'Genealogical trees show both hierarchy and connections'
            },
            // Chi (2009) - Conceptual Change
            conceptualChange: {
                citation: 'Chi (2009). Three types of conceptual change',
                principle: 'Understanding misconceptions requires tracing conceptual evolution',
                implementation: 'Historical context reveals common misconception patterns'
            },
            // Vygotsky (1978) - Historical-Cultural Approach
            historicalCultural: {
                citation: 'Vygotsky (1978). Mind in Society',
                principle: 'Understanding develops through historical and cultural tools',
                implementation: 'Ideas presented within their historical development context'
            },
            // Kuhn (1962) - Paradigm Shifts
            paradigmShifts: {
                citation: 'Kuhn (1962). The Structure of Scientific Revolutions',
                principle: 'Scientific understanding evolves through paradigm shifts',
                implementation: 'Major conceptual transitions highlighted in genealogy'
            }
        },
        keyFeatures: [
            'Historical context and evolution',
            'Key contributors and discoveries',
            'Paradigm shifts and controversies',
            'Cross-disciplinary influences',
            'Modern implications and future directions'
        ]
    }
};
/**
 * Cognitive Load Management Principles
 * Based on Sweller's Cognitive Load Theory
 */
exports.CognitiveLoadPrinciples = {
    intrinsicLoad: {
        principle: 'Manage complexity through progressive disclosure',
        implementation: 'Start simple, gradually increase complexity'
    },
    extraneousLoad: {
        principle: 'Minimize irrelevant processing',
        implementation: 'Clear, focused responses without tangents'
    },
    germaneLoad: {
        principle: 'Optimize schema construction',
        implementation: 'Explicit connections to prior knowledge'
    }
};
/**
 * Emotional Support Principles
 * Based on Academic Emotions research (Pekrun, 2006)
 */
exports.EmotionalSupportPrinciples = {
    achievement: {
        enjoyment: 'Celebrate progress and insights',
        hope: 'Set achievable next steps',
        pride: 'Acknowledge effort and growth'
    },
    epistemic: {
        curiosity: 'Spark wonder and exploration',
        surprise: 'Introduce unexpected connections',
        confusion: 'Frame as productive and temporary'
    },
    social: {
        empathy: 'Validate struggles and feelings',
        gratitude: 'Appreciate engagement and questions',
        admiration: 'Recognize good thinking'
    }
};
/**
 * Formative Assessment Principles
 * Based on Black & Wiliam (2009)
 */
exports.FormativeAssessmentPrinciples = {
    clarifyingIntentions: 'Make learning goals transparent',
    elicitingEvidence: 'Use questions to gauge understanding',
    providingFeedback: 'Give actionable, forward-looking feedback',
    activatingLearners: 'Students as owners of their learning',
    peerResources: 'Encourage collaborative sense-making'
};
