from manim import *
import math

class RecursiveFunctionAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Recursive Functions")
        subtitle = Text("Functions that call themselves to solve a problem", font_size=36).next_to(title, DOWN)
        self.play(FadeIn(title), FadeIn(subtitle))
        self.wait(2)
        self.play(FadeOut(title), FadeOut(subtitle))
        self.wait(1)

        # Section 2: Factorial Example
        self.next_section("Factorial Example")

        # Display the recursive definition
        definition = MathTex(r"\text{factorial}(n) = n \times \text{factorial}(n-1)").to_edge(UP)
        base_case = MathTex(r"\text{factorial}(0) = 1").next_to(definition, DOWN)
        self.play(Write(definition), Write(base_case))
        self.wait(2)

        # Remove the definition to make space for the call stack visualization
        self.play(FadeOut(definition), FadeOut(base_case))
        self.wait(0.5)

        # Visualize the call stack
        n_val = 4
        
        # Create all call frames first
        all_calls = []
        for i in range(n_val, -1, -1):
            call_text = f"factorial({i})"
            if i > 0:
                call_text += f" = {i} * factorial({i-1})"
            else:
                call_text += " = 1 (Base Case)"

            frame = Rectangle(width=6.5, height=1.0, color=BLUE)
            text = Text(call_text, font_size=32).move_to(frame.get_center())
            call_group = VGroup(frame, text)
            all_calls.append(call_group)

        # Arrange them in a VGroup and position it centrally
        call_stack = VGroup(*all_calls).arrange(DOWN, buff=0.1)
        call_stack.center() # Position the entire stack in the center

        # Animate their creation one by one
        for call_group in all_calls:
            self.play(Create(call_group), run_time=0.7)
            self.wait(0.5)

        self.wait(1)
        self.play(Indicate(call_stack[-1], color=GREEN)) # Highlight base case
        self.wait(1)

        # Animate the returns "unwinding"
        return_val = 1
        for i in range(1, n_val + 1):
            prev_group = call_stack[-(i + 1)]
            current_group = call_stack[-i]
            
            return_val_text = Text(str(return_val), font_size=32, color=YELLOW).move_to(current_group[1].get_center())

            self.play(
                FadeOut(current_group),
                return_val_text.animate.move_to(prev_group[1].get_center() + LEFT * 1.5)
            )
            self.wait(0.2)
            
            return_val = i * return_val
            new_text_str = f"factorial({i}) = {return_val}"
            new_text = Text(new_text_str, font_size=32).move_to(prev_group.get_center())

            self.play(FadeOut(return_val_text), Transform(prev_group[1], new_text))
            self.wait(1)

        final_result_box = SurroundingRectangle(call_stack[0], color=GREEN, buff=0.2)
        self.play(Create(final_result_box))
        self.wait(2)

        # Section 3: Conclusion
        self.next_section("Conclusion")
        self.play(FadeOut(*self.mobjects))
        
        conclusion_title = Text("Key Components of Recursion", font_size=48).to_edge(UP)
        base_case_text = Text("1. Base Case:", color=GREEN).next_to(conclusion_title, DOWN, buff=1).align_to(conclusion_title, LEFT)
        base_case_desc = Text("A condition to stop the recursion.", font_size=32).next_to(base_case_text, RIGHT, buff=0.2)
        
        recursive_step_text = Text("2. Recursive Step:", color=BLUE).next_to(base_case_text, DOWN, buff=0.5).align_to(base_case_text, LEFT)
        recursive_step_desc = Text("The function calls itself, moving closer to the base case.", font_size=32).next_to(recursive_step_text, RIGHT, buff=0.2)
        
        self.play(Write(conclusion_title))
        self.play(FadeIn(base_case_text, shift=RIGHT), FadeIn(base_case_desc, shift=RIGHT))
        self.wait(1)
        self.play(FadeIn(recursive_step_text, shift=RIGHT), FadeIn(recursive_step_desc, shift=RIGHT))
        self.wait(3)
        self.play(FadeOut(*self.mobjects))
