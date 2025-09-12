from manim import *

class BubbleSortAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Bubble Sort", font_size=72)
        self.play(Write(title))
        self.wait(1)

        # Create the initial array of numbers and boxes
        numbers = [5, 2, 8, 1, 9]
        num_mobjects = VGroup()
        box_mobjects = VGroup()

        for i, num in enumerate(numbers):
            number_obj = Integer(num).scale(1.5)
            box = SurroundingRectangle(number_obj, buff=0.4, color=BLUE)
            group = VGroup(box, number_obj)
            num_mobjects.add(group)

        num_mobjects.arrange(RIGHT, buff=0.5)
        self.play(ReplacementTransform(title, num_mobjects))
        self.wait(1)

        # Section 2: Sorting Process
        n = len(numbers)
        for i in range(n):
            self.next_section(f"Pass {i+1}")
            for j in range(0, n - i - 1):
                # Highlight the elements being compared
                box1 = num_mobjects[j][0]
                box2 = num_mobjects[j + 1][0]
                self.play(
                    box1.animate.set_color(YELLOW),
                    box2.animate.set_color(YELLOW)
                )
                self.wait(0.5)

                if numbers[j] > numbers[j + 1]:
                    # Swap the numbers
                    numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]
                    
                    # Animate the swap
                    num1_group = num_mobjects[j]
                    num2_group = num_mobjects[j + 1]
                    
                    self.play(
                        num1_group.animate.move_to(num2_group.get_center()),
                        num2_group.animate.move_to(num1_group.get_center())
                    )
                    # Swap their positions in the VGroup
                    num_mobjects[j], num_mobjects[j+1] = num_mobjects[j+1], num_mobjects[j]
                    self.wait(0.5)

                # Unhighlight the elements
                self.play(
                    box1.animate.set_color(BLUE),
                    box2.animate.set_color(BLUE)
                )
                self.wait(0.2)
            
            # Mark the sorted element
            sorted_box = num_mobjects[n - i - 1][0]
            self.play(sorted_box.animate.set_color(GREEN))
            self.wait(0.5)

        # Section 3: Conclusion
        self.next_section("Conclusion")
        sorted_text = Text("Array is Sorted!", font_size=48).next_to(num_mobjects, DOWN, buff=1)
        self.play(Write(sorted_text))
        self.wait(2)
        
        self.play(
            FadeOut(num_mobjects),
            FadeOut(sorted_text)
        )
        self.wait(1)

