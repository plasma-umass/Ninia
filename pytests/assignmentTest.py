a,b,c = 1,2,3
print a,b,c

x,y,z = a,b,c
print x,y,z

e,f = 1, x
print e, f

a,b = 3 + e, 4 + f
print a, b

j,k,l,m,n = range(5)
print j,k,l,m,n

# conditional assignment
# <condition> and <true_result> or <false_result>
a = 5
b = -1
print (a < 0 and 'negative' or 'positive')
print (b < 0 and 'negative' or 'positive')

