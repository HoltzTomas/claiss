from manim import *

class BubbleSortAnimation(Scene):
    def construct(self):
        # Data
        numbers = [5, 2, 8, 1, 9, 4]
        n = len(numbers)

        # Create visual representation of the array
        squares = VGroup(*[Square(side_length=1, fill_color=YELLOW, fill_opacity=0.5) for _ in numbers])
        labels = VGroup(*[Text(str(num)) for num in numbers])
        
        for square, label in zip(squares, labels):
            label.move_to(square.get_center())

        array = VGroup(*[VGroup(sq, lbl) for sq, lbl in zip(squares, labels)])
        array.arrange(RIGHT, buff=0.5)

        # --- Introduction ---
        self.next_section("Introduction")
        title = Text("Bubble Sort Algorithm", font_size=48)
        self.play(Write(title), run_time=0.8)
        self.wait(0.5)
        self.play(FadeOut(title), run_time=0.5)
        
        # --- Sorting Process ---
        self.next_section("Sorting Process")
        explanation = Text("We compare adjacent elements and swap them if they are in the wrong order.", font_size=24).to_edge(UP)
        self.play(FadeIn(explanation), run_time=0.8)
        self.play(Create(array), run_time=0.8)
        self.wait(0.5)

        # Pointers
        pointer1 = Triangle(fill_opacity=1, color=YELLOW).scale(0.2).next_to(array[0], DOWN)
        pointer2 = Triangle(fill_opacity=1, color=YELLOW).scale(0.2).next_to(array[1], DOWN)
        self.play(Create(pointer1), Create(pointer2), run_time=0.5)
        self.wait(0.5)

        # Bubble sort logic
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                # Move pointers
                self.play(
                    pointer1.animate.next_to(array[j], DOWN),
                    pointer2.animate.next_to(array[j + 1], DOWN),
                    run_time=0.3
                )

                # Highlight elements being compared
                self.play(
                    array[j][0].animate.set_fill(BLUE, opacity=0.5),
                    array[j + 1][0].animate.set_fill(BLUE, opacity=0.5),
                    run_time=0.3
                )

                if numbers[j] > numbers[j + 1]:
                    # Swap numbers in the list
                    numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]
                    swapped = True
                    
                    # Animate the swap
                    pos_j = array[j].get_center()
                    pos_j1 = array[j+1].get_center()
                    self.play(
                        array[j].animate.move_to(pos_j1),
                        array[j+1].animate.move_to(pos_j),
                        run_time=0.6
                    )
                    # Swap mobjects in the VGroup for correct positioning in the next steps
                    array[j], array[j+1] = array[j+1], array[j]

                # Unhighlight
                self.play(
                    array[j][0].animate.set_fill(YELLOW, opacity=0.5),
                    array[j + 1][0].animate.set_fill(YELLOW, opacity=0.5),
                    run_time=0.3
                )

            # Mark the sorted element
            self.play(array[n - i - 1][0].animate.set_fill(GREEN, opacity=0.7), run_time=0.5)
            
            if not swapped:
                # If no swaps occurred, the array is sorted
                for k in range(n - i - 1):
                    self.play(array[k][0].animate.set_fill(GREEN, opacity=0.7), run_time=0.1)
                break
        
        # --- Conclusion ---
        self.next_section("Conclusion")
        self.play(FadeOut(pointer1), FadeOut(pointer2), FadeOut(explanation), run_time=0.5)
        
        sorted_text = Text("Array is Sorted!", font_size=48).to_edge(UP)
        self.play(Write(sorted_text), run_time=0.8)
        self.wait(1)
        self.play(FadeOut(sorted_text), FadeOut(array), run_time=0.5)
        self.wait(0.5)
