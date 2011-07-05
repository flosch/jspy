print (lambda p:p[0]+'.'+p[1:])(
    str((lambda(x,y,t,a):(2L*x*x)//a)(
        (lambda F:(lambda S:reduce(
            lambda(x,y,t,a),_:
            (lambda x1,y1:(x1,y1,2L*t,
                (a-(t*(x1*x1-y1*y1))//F)))(
                    (x+y)//2L,S((x*y)//F)),
            [0]*13,(F,(F*F)//S(2L*F),2L,F//2L)))(
                lambda n:reduce(lambda x,_:(
                    x-x//2L+(n*F)//(2L*x)),[0]*15,
                n//2L)))(10L**(5010))))[:5000])