from manim import *

class BubbleSortAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Bubble Sort Algorithm", font_size=48)
        self.play(Create(title))
        self.wait(1)
        self.play(FadeOut(title))

        # Section 2: Unsorted Array Setup
        self.next_section("Unsorted Array")
        initial_array = [5, 2, 8, 12, 1, 6]
        rects = VGroup()
        for i, value in enumerate(initial_array):
            rect = Rectangle(
                height=value/2, 
                width=0.8, 
                fill_opacity=0.7, 
                fill_color=BLUE,
                stroke_color=WHITE
            ).move_to(RIGHT * (i - 2.5) * 1.2)
            text = Text(str(value), font_size=20).move_to(rect.get_center())
            group = VGroup(rect, text)
            rects.add(group)

        self.play(Create(rects))
        self.wait(1)

        # Section 3: Bubble Sort Animation
        self.next_section("Sorting Process")
        for i in range(len(initial_array)):
            for j in range(0, len(initial_array) - i - 1):
                # Highlight comparison
                compare_rects = VGroup(rects[j], rects[j+1])
                self.play(
                    compare_rects.animate.set_color(RED),
                    run_time=0.5
                )

                # Swap if needed
                if initial_array[j] > initial_array[j+1]:
                    initial_array[j], initial_array[j+1] = initial_array[j+1], initial_array[j]
                    
                    # Animate swap
                    self.play(
                        Swap(rects[j], rects[j+1]),
                        run_time=0.5
                    )

                # Reset color
                self.play(
                    compare_rects.animate.set_color(BLUE),
                    run_time=0.5
                )

        # Section 4: Final Sorted Array
        self.next_section("Sorted Array")
        sorted_text = Text("Sorted Array!", font_size=36).next_to(rects, DOWN * 2)
        self.play(Create(sorted_text))
        self.wait(2)