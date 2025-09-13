from manim import *

class BubbleSortAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Bubble Sort Algorithm", color=BLUE)
        self.play(FadeIn(title))
        self.wait(1)
        self.play(FadeOut(title))

        # Section 2: Initial Array
        self.next_section("Initial Array")
        numbers = [6, 3, 8, 2, 5]
        squares = VGroup(*[
            Square(side_length=1)
            .set_fill(BLUE_B, opacity=0.5)
            .set_stroke(BLUE_D)
            for _ in numbers
        ]).arrange(RIGHT, buff=0.2)
        
        labels = VGroup(*[
            Text(str(num), color=WHITE).move_to(square)
            for num, square in zip(numbers, squares)
        ])
        
        array_group = VGroup(squares, labels)
        array_group.move_to(ORIGIN)
        
        self.play(Create(squares), Write(labels))
        self.wait(1)

        # Section 3: Sorting Process
        self.next_section("Sorting Process")
        
        # Helper function to swap elements
        def swap_elements(i, j):
            animations = []
            # Move squares up and down in opposite directions
            animations.append(
                squares[i].animate.shift(UP * 0.5)
            )
            animations.append(
                squares[j].animate.shift(DOWN * 0.5)
            )
            self.play(*animations)
            
            # Swap horizontally
            animations = []
            animations.append(
                squares[i].animate.shift(RIGHT * 1.2)
            )
            animations.append(
                squares[j].animate.shift(LEFT * 1.2)
            )
            animations.append(
                labels[i].animate.shift(RIGHT * 1.2)
            )
            animations.append(
                labels[j].animate.shift(LEFT * 1.2)
            )
            self.play(*animations)
            
            # Move squares back to original height
            animations = []
            animations.append(
                squares[i].animate.shift(DOWN * 0.5)
            )
            animations.append(
                squares[j].animate.shift(UP * 0.5)
            )
            self.play(*animations)
            
            # Swap the actual objects in our lists
            squares[i], squares[j] = squares[j], squares[i]
            labels[i], labels[j] = labels[j], labels[i]
            numbers[i], numbers[j] = numbers[j], numbers[i]

        # Perform bubble sort
        n = len(numbers)
        for i in range(n):
            for j in range(0, n - i - 1):
                # Highlight current comparison
                squares[j].set_fill(YELLOW, opacity=0.5)
                squares[j + 1].set_fill(YELLOW, opacity=0.5)
                self.wait(0.5)
                
                if numbers[j] > numbers[j + 1]:
                    swap_elements(j, j + 1)
                
                # Reset colors
                squares[j].set_fill(BLUE_B, opacity=0.5)
                squares[j + 1].set_fill(BLUE_B, opacity=0.5)

        # Section 4: Final State
        self.next_section("Final State")
        # Highlight sorted array
        self.play(
            *[square.animate.set_fill(GREEN_B, opacity=0.5) for square in squares]
        )
        self.wait(1)

        # Show "Sorted!" text
        sorted_text = Text("Sorted!", color=GREEN).scale(1.5)
        sorted_text.next_to(array_group, UP * 2)
        self.play(Write(sorted_text))
        self.wait(2)

        # Fade out everything
        self.play(
            *[FadeOut(mob) for mob in [squares, labels, sorted_text]]
        )