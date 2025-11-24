import { Chapter } from '../types';

export const SAMPLE_CHAPTERS: Chapter[] = [
  {
    id: '1',
    title: 'Chapter 1: The Magic Garden',
    content: `Once upon a time, in a small village nestled between rolling hills, there lived a curious little girl named Luna. She had bright eyes that sparkled with wonder and a heart full of dreams.

One sunny morning, Luna discovered a hidden path behind her grandmother's cottage. The path was covered with moss and lined with colorful wildflowers that seemed to glow in the morning light.

"I wonder where this leads," Luna whispered to herself, taking her first steps down the mysterious trail.

As she walked deeper into the forest, the trees grew taller and the air filled with the sweet scent of jasmine. Butterflies danced around her head, as if guiding her forward.

Soon, Luna arrived at a magnificent garden she had never seen before. The garden was filled with flowers of every color imaginable, and in the center stood a magnificent fountain that sparkled like diamonds in the sunlight.`,
  },
  {
    id: '2',
    title: 'Chapter 2: The Talking Flowers',
    content: `As Luna approached the fountain, she heard something extraordinary—the flowers were talking!

"Welcome, young Luna," said a tall sunflower with a friendly voice. "We've been waiting for someone like you."

Luna gasped in amazement. "You can talk?"

"Of course we can!" giggled a cluster of pink roses. "In this magic garden, everything is possible."

A wise old oak tree leaned down to greet her. "This garden has been asleep for many years, waiting for a child with a pure heart and curious mind to bring it back to life."

Luna's eyes widened with excitement. "What can I do to help?"

The sunflower swayed gently. "You must find the three magic seeds hidden throughout the garden. When planted together, they will restore the garden's full magic and beauty."`,
  },
  {
    id: '3',
    title: 'Chapter 3: The Quest Begins',
    content: `Luna set off on her adventure with determination in her heart. The flowers gave her clues about where to find the magic seeds.

"The first seed lies where the morning dew glistens longest," whispered the roses.

Luna thought carefully and walked toward the shadowy part of the garden where the tall trees blocked the sun. There, on a bed of soft moss, she found a golden seed that glowed softly.

"I found it!" she exclaimed with joy.

The butterflies circled around her, celebrating her success. "Two more to go," they sang in harmony.

Luna continued her search, following a babbling brook that wound through the garden. The water seemed to be leading her somewhere special.

By a small waterfall, nestled between smooth stones, she discovered the second seed. This one was silver and cool to the touch.`,
  },
  {
    id: '4',
    title: 'Chapter 4: The Final Seed',
    content: `Finding the third seed proved to be the most challenging. Luna searched high and low, behind bushes and under leaves, but couldn't find it anywhere.

Just as she was about to give up, she heard a tiny voice. "Help! I'm stuck!"

Luna looked around and spotted a small bird tangled in some vines near the top of a tree.

Without hesitation, Luna carefully climbed the tree and gently freed the bird from the vines. The grateful bird chirped happily and flew in a circle around her head.

"Thank you for your kindness," said the bird. "I know where the last seed is hidden. Follow me!"

The bird led Luna to a beautiful bird's nest hidden in the branches. There, among the soft feathers, lay the third seed—a brilliant ruby red.

"Your kindness has earned you the final seed," the bird sang. "The magic garden rewards those with compassionate hearts."`,
  },
  {
    id: '5',
    title: 'Chapter 5: The Garden Awakens',
    content: `Luna hurried back to the fountain with all three seeds in her hands. The flowers gathered around her, their petals trembling with anticipation.

"Plant them together in the soil around the fountain," instructed the oak tree.

Luna carefully placed the three seeds in the ground, making sure they were close together. As soon as she covered them with soil, something magical happened.

The fountain began to glow with brilliant light. The water sparkled and rose high into the air, creating a beautiful rainbow. The entire garden burst into bloom, with new flowers appearing everywhere.

The trees grew fuller and greener, the grass became softer, and the air filled with the most wonderful fragrance. Music seemed to flow from every corner of the garden.

"You've done it, Luna!" cheered all the flowers together. "You've restored the magic garden to its full glory!"

Luna smiled with pride and happiness. She knew she had found a special place where she would always be welcome, and where magic and wonder would never end.

From that day forward, Luna visited the magic garden often, and it became her favorite place in the whole world. And the garden, grateful for her pure heart, shared its magic with her forever.

The End.`,
  },
];

export const SAMPLE_SINGLE_TEXT = `The Magic Garden

A Children's Story

${SAMPLE_CHAPTERS.map(chapter => `${chapter.title}\n\n${chapter.content}`).join('\n\n\n')}`;
