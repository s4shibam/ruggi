import { Link } from '@tanstack/react-router';
import { Sun } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';

import { Nav } from '@/components/blocks/nav';
import { Button } from '@/components/ui/button';

const headingLine1 = 'AI That Reads For You';
const headingLine2 = "So You Don't Have To";
const descriptionText =
  'Share documents and let our AI analyze and answer questions about the content. Save time with intelligent processing.';

export const Hero = () => {
  const line1Words = headingLine1.split(' ');
  const line2Words = headingLine2.split(' ');
  const totalHeadingWords = line1Words.length + line2Words.length;

  const { scrollYProgress } = useScroll();
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <section className='relative flex min-h-screen flex-col overflow-hidden'>
      <Nav />
      <div className='relative mx-auto flex w-full max-w-4xl grow flex-col items-center justify-center border-x bg-radial-[at_top] from-primary/30 to-transparent px-4 py-20'>
        <h1 className='mb-6 max-w-3xl text-center font-bold text-3xl text-foreground tracking-tight sm:text-4xl md:text-5xl lg:text-6xl'>
          <span className='block'>
            {line1Words.map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
                className='mr-[0.25em] inline-block'
              >
                {word}
              </motion.span>
            ))}
          </span>
          <span className='block'>
            {line2Words.map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: (line1Words.length + index) * 0.08,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
                className='mr-[0.25em] inline-block'
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: totalHeadingWords * 0.08 + 0.3,
            ease: [0.25, 0.4, 0.25, 1]
          }}
          className='mx-auto max-w-xl text-center font-light text-muted-foreground text-sm sm:text-base md:text-lg'
        >
          {descriptionText}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: totalHeadingWords * 0.08 + 0.3 + 0.5,
            ease: [0.25, 0.4, 0.25, 1]
          }}
          className='mt-12'
        >
          <Button
            size='lg'
            asChild
            className='h-12 rounded-full bg-radial-[at_top] from-foreground to-foreground/75 px-10 text-background transition-all duration-300 sm:h-14 md:h-16 md:text-lg'
          >
            <Link to='/auth/signin'>Get Started</Link>
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ rotate }}
        transition={{
          duration: 0.6,
          delay: totalHeadingWords * 0.08 + 0.3 + 0.5 + 0.3,
          ease: [0.25, 0.4, 0.25, 1]
        }}
        className='absolute inset-x-0 bottom-0 flex w-full translate-y-1/2 items-center justify-center'
      >
        <Sun className='size-64 text-accent sm:size-80' strokeWidth={1} />
      </motion.div>
    </section>
  );
};
